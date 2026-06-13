/**
 * zkProof.ts — server-side wrapper around the zkArb SDK.
 *
 * The SDK's `verifyProof(input, artifactsPath)`:
 *   1. Generates a real Groth16 proof from the circuit (savings_verifier).
 *      Witness generation FAILS (throws) if the circuit is unsatisfiable —
 *      i.e. savings_amount < min_amount OR elapsed < min_duration. This is
 *      what enforces the threshold: a below-threshold user literally cannot
 *      produce a proof.
 *   2. Verifies that proof on the deployed Solidity verifier on Arbitrum
 *      Sepolia via a read-only eth_call, returning
 *      `{ result: boolean, publicSignals: string[] }`.
 *
 * This is genuine on-chain verification and costs nothing — no wallet, no
 * gas, no private key. We do NOT send any transaction; the proof of validity
 * is the SDK confirming the deployed verifier accepted the proof.
 *
 * This module must only run server-side (API route): it touches the filesystem
 * and spawns the snarkjs CLI.
 */
import path from "path";
import fs from "fs";
import { verifyProof as sdkVerifyProof } from "zkarb-sdk";

export const ARTIFACTS_PATH = path.join(process.cwd(), "zk-integration", "savings_verifier");

export interface ZkProofInput {
  savingsAmount: bigint | string | number;
  lockStart: bigint | string | number;
  minAmount: bigint | string | number;
  minDuration: bigint | string | number;
  currentTime: bigint | string | number;
}

export interface ZkProofResult {
  verified: boolean;
  publicSignals: string[];
  verifierContract: string;
}

function getVerifierContract(): string {
  const raw = fs.readFileSync(path.join(ARTIFACTS_PATH, "deployment.json"), "utf8");
  return (JSON.parse(raw) as { contractAddress: string }).contractAddress;
}

/**
 * Generate a ZK proof of the savings thresholds and verify it on-chain via
 * the zkArb SDK. Throws if proof generation fails (thresholds not met).
 */
export async function generateAndVerifyProof(input: ZkProofInput): Promise<ZkProofResult> {
  const verifierContract = getVerifierContract();

  // The circuit signals must be plain integer strings.
  const circuitInput = {
    savings_amount: BigInt(input.savingsAmount).toString(),
    lock_start: BigInt(input.lockStart).toString(),
    min_amount: BigInt(input.minAmount).toString(),
    min_duration: BigInt(input.minDuration).toString(),
    current_time: BigInt(input.currentTime).toString(),
  };

  // Real proof generation + on-chain (read-only) verification via the SDK.
  const sdkResult = (await sdkVerifyProof(circuitInput, ARTIFACTS_PATH)) as {
    result: unknown;
    publicSignals: unknown[];
  };

  const verified = sdkResult?.result === true || String(sdkResult?.result) === "true";
  const publicSignals = (sdkResult?.publicSignals ?? []).map((s) => String(s));

  return { verified, publicSignals, verifierContract };
}
