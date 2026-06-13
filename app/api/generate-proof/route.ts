import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { VAULT_ABI, ERC20_ABI, CONTRACTS } from "@/lib/contracts";
import { getVaultByAddress } from "@/lib/receiptService";
import { generateAndVerifyProof } from "@/lib/zkProof";
import { saveProof } from "@/lib/proofStore";

// The zkArb SDK shells out to the snarkjs CLI and uses web3, so it needs the
// Node runtime; proof generation can also take several seconds.
export const runtime = "nodejs";
export const maxDuration = 60;

const RPC_URL =
  process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://arbitrum-sepolia-rpc.publicnode.com";

/**
 * POST /api/generate-proof
 * Body: { vaultAddress, minAmount, minDuration }
 *   - minAmount:   threshold in token base units (string), chosen by the user
 *   - minDuration: threshold in seconds, chosen by the user
 *
 * Reads the real savings balance from the PersonalVault on-chain and the vault
 * creation time server-side (never trusting the client for the private inputs),
 * generates + verifies a ZK proof on Arbitrum Sepolia via the zkArb SDK, and
 * stores only the public metadata in Firebase (no wallet/vault address).
 */
export async function POST(req: NextRequest) {
  try {
    const { vaultAddress, minAmount, minDuration } = await req.json();

    if (!vaultAddress || minAmount === undefined || minDuration === undefined) {
      return NextResponse.json(
        { error: "vaultAddress, minAmount and minDuration are required." },
        { status: 400 }
      );
    }

    const client = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(RPC_URL),
    });

    // 1. savings_amount — read directly from the PersonalVault (real on-chain data).
    const savingsAmount = (await client.readContract({
      address: vaultAddress as `0x${string}`,
      abi: VAULT_ABI,
      functionName: "totalAssets",
    })) as bigint;

    // 2. token decimals — for converting base units <-> dollars on display.
    const decimals = Number(
      (await client.readContract({
        address: CONTRACTS.arbitrumSepolia.USDCToken,
        abi: ERC20_ABI,
        functionName: "decimals",
      })) as number
    );

    // 3. lock_start — the vault creation timestamp. PersonalVault does not store
    //    a creation time on-chain (only unlockTimestamp), so we read it from our
    //    own vault record SERVER-SIDE. Because the client never supplies it, the
    //    user cannot lie about how long they have been saving.
    const vaultRecord = await getVaultByAddress(vaultAddress);
    if (!vaultRecord) {
      return NextResponse.json(
        { error: "Vault record not found — cannot determine lock start time." },
        { status: 404 }
      );
    }
    const lockStart = Math.floor(vaultRecord.createdAt / 1000); // createdAt is in ms

    const currentTime = Math.floor(Date.now() / 1000);

    // 4. Generate + verify the proof on-chain via the zkArb SDK (read-only
    //    verification — no transaction, no gas). Proof generation throws if the
    //    circuit is unsatisfiable (savings below threshold, or not locked long
    //    enough).
    let proof;
    try {
      proof = await generateAndVerifyProof({
        savingsAmount,
        lockStart,
        minAmount,
        minDuration,
        currentTime,
      });
    } catch (err) {
      console.warn("[generate-proof] proof generation failed:", err);
      return NextResponse.json(
        { error: "Savings do not meet the required threshold." },
        { status: 400 }
      );
    }

    if (!proof.verified) {
      return NextResponse.json(
        { error: "Savings do not meet the required threshold." },
        { status: 400 }
      );
    }

    // 5. Persist only the public metadata. No wallet/vault address.
    const minAmountUsd = Number(BigInt(minAmount)) / 10 ** decimals;
    const minDurationDays = Math.round(Number(minDuration) / 86400);

    const proofId = await saveProof({
      minAmount: BigInt(minAmount).toString(),
      minAmountUsd,
      minDuration: Number(minDuration),
      minDurationDays,
      decimals,
      currentTime,
      verifierContract: proof.verifierContract,
    });

    return NextResponse.json({
      proofId,
      verifierContract: proof.verifierContract,
      minAmountUsd,
      minDurationDays,
    });
  } catch (err) {
    console.error("[generate-proof] error:", err);
    return NextResponse.json(
      { error: "Proof generation failed.", detail: String(err) },
      { status: 500 }
    );
  }
}
