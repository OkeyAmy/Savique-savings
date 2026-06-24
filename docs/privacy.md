# Privacy: Zero-Knowledge Proof of Savings (zkArb SDK)

This document explains Savique's flagship privacy feature in depth: how a user can prove
their financial discipline to a third party **without revealing their wallet address, exact
balance, or transaction history**. It is built on the
[`zkArb SDK`](https://github.com/jatinsahijwani/zkArb-sdk) (`zkarb-sdk`) and a pre-compiled
**Groth16** circuit deployed on **Arbitrum Sepolia**.

For the product context see [Introduction.md](./Introduction.md); for where this fits in the
system see [architecture.md](./architecture.md).

---

## 1. The Privacy Problem

Proving savings to a landlord, bank, or auditor normally forces an unpleasant trade-off:

- Hand over your **wallet address** so they can inspect it — which exposes your **exact
  balance**, your **entire transaction history**, and links it all to **your identity**; or
- Provide a screenshot or statement that is trivially **forgeable** and carries no
  cryptographic guarantee.

Both are bad. The third party only needs to know one thing — *"does this person hold at
least $X, and have they held it for at least Y months?"* — yet the usual methods leak vastly
more than that, or prove nothing at all.

## 2. The Solution: Prove the Predicate, Reveal Nothing Else

Savique lets a user generate a **zero-knowledge proof** of exactly one statement:

> *"I have saved at least **min_amount** and have been locked up for at least
> **min_duration**."*

The proof reveals **only the thresholds the user chose** (and a timestamp). It does **not**
reveal:

- the wallet address or vault address,
- the actual savings balance (only that it is `>=` the threshold),
- the actual lock-start time (only that the elapsed time is `>=` the threshold),
- any transaction history.

Crucially, the proof is **unforgeable**: if the user's savings are below the threshold, a
valid proof is **mathematically impossible** to produce.

---

## 3. The Circuit (`savings_verifier.circom`)

The privacy guarantee comes from a Circom circuit (`zk-integration/savings_verifier.circom`)
compiled into a Groth16 proving system.

### Signals

| Signal           | Visibility  | Meaning                                                |
| ---------------- | ----------- | ------------------------------------------------------ |
| `savings_amount` | **private** | actual balance in token base units (never revealed)    |
| `lock_start`     | **private** | vault creation unix timestamp (never revealed)         |
| `min_amount`     | public      | the savings threshold the user chose                   |
| `min_duration`   | public      | the lock-duration threshold (seconds) the user chose   |
| `current_time`   | public      | unix timestamp at proof generation                     |

### Constraints

```circom
signal elapsed;
elapsed <== current_time - lock_start;

component amt_check = GreaterEqThan(64);
amt_check.in[0] <== savings_amount;
amt_check.in[1] <== min_amount;

component dur_check = GreaterEqThan(64);
dur_check.in[0] <== elapsed;
dur_check.in[1] <== min_duration;

// Hard constraints — the circuit is UNSATISFIABLE if either fails.
amt_check.out === 1;
dur_check.out === 1;
```

The two `=== 1` lines are the heart of the design. They turn the inequalities into **hard
constraints**: if `savings_amount < min_amount` *or* `elapsed < min_duration`, the constraint
system has **no satisfying witness**, so witness generation throws and **no proof can be
produced**. A below-threshold user is not "rejected by policy" — they are stopped by
mathematics.

Only `min_amount`, `min_duration`, and `current_time` are declared public
(`component main {public [...]}`), so the private balance and lock-start never leave the
prover's machine and never appear in the proof.

---

## 4. The Integration (`zkArb SDK`)

### 4.1 Where the SDK is used

The SDK is wrapped server-side in `lib/zkProof.ts`. It exposes a single function,
`generateAndVerifyProof`, which:

1. Reads the deployed verifier address from
   `zk-integration/savings_verifier/deployment.json`.
2. Normalizes the circuit inputs to plain integer strings.
3. Calls `verifyProof(circuitInput, ARTIFACTS_PATH)` from `zkarb-sdk`.

```ts
import { verifyProof as sdkVerifyProof } from "zkarb-sdk";

export const ARTIFACTS_PATH = path.join(process.cwd(), "zk-integration", "savings_verifier");

const sdkResult = await sdkVerifyProof(
  {
    savings_amount: BigInt(input.savingsAmount).toString(),
    lock_start:     BigInt(input.lockStart).toString(),
    min_amount:     BigInt(input.minAmount).toString(),
    min_duration:   BigInt(input.minDuration).toString(),
    current_time:   BigInt(input.currentTime).toString(),
  },
  ARTIFACTS_PATH
);
```

### 4.2 What `verifyProof()` does

`verifyProof(input, artifactsPath)` performs the full proof lifecycle:

1. **Generates a real Groth16 proof** from the circuit using the artifacts in
   `savings_verifier/` (the `.wasm` witness generator and the `circuit_final.zkey` proving
   key). Witness generation **fails (throws)** if the circuit is unsatisfiable — i.e. savings
   below threshold or not locked long enough.
2. **Verifies that proof on-chain** against the deployed Solidity verifier
   (`0xc7CfEEb82aAb351359B8AaD5c5522b346567Ee79`) on Arbitrum Sepolia via a **read-only
   `eth_call`**, returning `{ result: boolean, publicSignals: string[] }`.

This is **genuine on-chain verification** that costs nothing — **no wallet, no gas, no
private key, no transaction is sent**. The proof of validity is the deployed verifier
contract confirming, via a free read call, that it accepts the proof.

Because the SDK shells out to the `snarkjs` CLI and touches the filesystem, `zkProof.ts`
**must run server-side only**. The `/api/generate-proof` route therefore pins
`export const runtime = "nodejs"` and allows up to `maxDuration = 60` seconds for proof
generation.

### 4.3 Artifacts

```
zk-integration/savings_verifier/
├── circuit_final.zkey       # Groth16 proving key
├── verifier.sol             # the on-chain verifier source
├── deployment.json          # { contractAddress, abi } of the deployed verifier
├── savings_verifier.r1cs    # rank-1 constraint system
└── savings_verifier_js/
    ├── savings_verifier.wasm # witness generator
    ├── generate_witness.js
    └── witness_calculator.js
```

The deployed verifier exposes a single `view` function,
`verifyProof(uint256[2] _pA, uint256[2][2] _pB, uint256[2] _pC, uint256[3] _pubSignals)
returns (bool)` — three public signals matching `[min_amount, min_duration, current_time]`.

---

## 5. The Trust Model — Why the Proof Can't Be Faked

A privacy proof is only useful if it cannot be gamed. Savique closes the obvious loopholes:

1. **The user cannot lie about their balance.** The `/api/generate-proof` route reads
   `savings_amount` directly from the vault on-chain via
   `PersonalVault.totalAssets()` — it never accepts the balance from the client.
2. **The user cannot lie about duration.** `lock_start` is read **server-side** from the
   vault record's `createdAt` (the `PersonalVault` only stores `unlockTimestamp` on-chain,
   not its creation time). Because the client never supplies `lock_start`, it cannot inflate
   how long it has been saving.
3. **The user cannot forge a below-threshold proof.** The circuit's `=== 1` constraints make
   any below-threshold witness non-existent; `verifyProof()` throws before a proof is ever
   produced.
4. **A fake proof cannot pass verification.** Even a hand-crafted proof object is checked by
   the real deployed verifier contract on-chain; only a genuinely valid Groth16 proof returns
   `true`.

If proof generation fails or verification returns false, the API responds with
*"Savings do not meet the required threshold."* and **no proof document is created**.

---

## 6. What Gets Stored — Privacy by Construction

Only the **public metadata** of a successful proof is persisted, and the storage layer is
explicitly scrubbed of identity. From `lib/proofStore.ts`:

```ts
export interface ProofDocument {
  proofId: string;          // shareable id (nanoid)
  minAmount: string;        // threshold in base units
  minAmountUsd: number;     // threshold in dollars (display)
  minDuration: number;      // threshold in seconds
  minDurationDays: number;  // threshold in days (display)
  decimals: number;         // token decimals
  currentTime: number;      // unix seconds at proof generation
  verifierContract: string; // the verifier that confirmed the proof
  createdAt: number;
  // *** wallet / vault address intentionally omitted ***
}
```

There is **no wallet address, no vault address, and no balance** anywhere in the stored
document — nothing that links the proof back to the prover's identity. The shareable
`/proof/[proofId]` page renders only these public thresholds, the verifier contract (linkable
on Arbiscan), and the timestamp.

---

## 7. End-to-End Flow

```
User (vault detail page)                Server (/api/generate-proof)            Chain (Arbitrum Sepolia)
─────────────────────────               ────────────────────────────           ────────────────────────
1. Open "Share Proof", pick
   thresholds ($1,000 / 3 mo) ─────────► 2. read savings_amount  ─────────────► PersonalVault.totalAssets()
                                          3. read token decimals  ─────────────► USDC.decimals()
                                          4. read lock_start (server-side
                                             from vault record createdAt)
                                          5. generateAndVerifyProof():
                                               - build Groth16 proof (snarkjs)
                                               - verifyProof() read-only  ──────► ZK Verifier.verifyProof() (eth_call)
                                          6. store ONLY public metadata
                                             in Firestore (no address)
8. Receive /proof/<id> link  ◄────────── 7. return { proofId, verifierContract,
   (share with landlord)                      minAmountUsd, minDurationDays }
```

The landlord opens the link and sees a cryptographically-backed statement —
*"holds at least $1,000, for at least 3 months, verified by contract 0xc7Cf… on Arbitrum
Sepolia"* — with no way to learn who the prover is.

---

## 8. Verifying the Integration Locally

A standalone test (`zk-integration/test-proof.js`) exercises the SDK against the live
verifier with no Firebase, wallet, or gas:

```bash
# snarkjs must be on PATH
PATH="$PWD/node_modules/.bin:$PATH" node zk-integration/test-proof.js
```

It runs two cases:

- **PASS** — $2,000 saved, locked 200 days, threshold $1,000 / 90 days → the on-chain
  verifier returns `true`.
- **FAIL** — $500 saved against a $1,000 threshold → `verifyProof()` throws because the
  circuit is unsatisfiable, proving a below-threshold proof cannot be produced.

---

## 9. Privacy Guarantees — Summary

| Property                         | Guarantee                                                            |
| -------------------------------- | ------------------------------------------------------------------- |
| Balance confidentiality          | Only `>= min_amount` is revealed; exact balance stays private        |
| Duration confidentiality         | Only `>= min_duration` is revealed; exact lock-start stays private   |
| Identity unlinkability           | No wallet/vault address is ever stored or shown                      |
| Unforgeability                    | Below-threshold proofs are mathematically impossible                 |
| Independent verifiability         | Confirmed by a public verifier contract on Arbitrum Sepolia          |
| Zero cost / zero custody          | Read-only verification: no gas, no transaction, no private key       |
| Input integrity                   | Private inputs are read on-chain/server-side, never from the client  |
