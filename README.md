# Savique: Professional Savings Commitment Protocol

Savique is a premium, disciplined, on-chain savings platform designed for high-conviction wealth building. It bridges the gap between decentralized assets and real-world financial maturity through cryptographic commitments and verifiable audit trails.

---

##  The Problem

Modern digital wealth is engineered for high liquidity, which often leads to **financial indiscretion**. Traditional wallets make it too easy to "dip into" funds meant for long-term goals or essential expenses like rent, taxes, or business capital.

Furthermore, when users need to prove their financial stability to third parties (landlords, auditors, or banks), they lack a **verifiable, tamper-proof audit trail** that proves they have the discipline to hold and commit capital over time. Traditional institutions typically reject raw wallet balances because they lack standardized, verifiable histories.

---

## ✅ The Solution

Savique provides a **Strategic Commitment Layer** for your capital. By moving beyond simple "storage," it introduces:

1.  **Enforced Discipline**: Funds are cryptographically sealed for a user-defined period, removing the temptation of impulsive spending.
2.  **On-Chain Receipt System**: To solve the verification gap with landlords and banks, Savique generates an immutable receipt for every action. This acts as a standardized, tamper-proof audit trail tied directly to Arbitrum transaction hashes.
3.  **Real-World Utility**: Bridge the gap to IRL financial requirements. Users can present their Transaction History Dashboard to third parties as cryptographic proof of their financial discipline and capital retention over time.

---

## ✨ Premium Features (V2)

### 1. Sinking Fund Protocol (Goal Tracking)
Users can now set specific financial targets (e.g., "Property Deposit," "Emergency Fund"). The protocol tracks your progress in real-time, visualizing how close you are to your absolute financial freedom.

### 2. Flexible Top-Ups
Unlike static savings contracts, Savique allows you to "fuel" your goals. You can add funds to any active savings plan at any time, compounding your commitment without extending the lock-up period.

### 3. Emergency Beneficiary Protocol (Inheritance)
The ultimate peace of mind. Users can designate an emergency beneficiary address. If the owner becomes inactive after the lock period ends, the protocol allows beneficiary to withdraw funds through safety and recovery way ensuring wealth is never lost to the void.

### 4. Professional Notification System
Stay connected to your wealth. Savique integrates an automated notification system that sends:
*   **Transaction Confirmations**: Instant receipts via email.
*   **Maturity Alerts**: Notifications when your capital is ready for deployment.
*   **Security Warnings**: Alerts for any unauthorized early withdrawal attempts.

### 5. Financial Intelligence & TVL Dashboard
A visual command center for tracking Total Value Locked (TVL) and wealth trajectories.
*   **Proof of Reserves**: Real-time transparency of all capital secured by the protocol.
*   **Audit Distribution**: Categorized view of all financial proofs and receipts.

### 6. The Yield-Sharing Engine
Every dollar saved is now productive capital earning Aave V3 yield.
*   **Protocol Yield Split**: 80% to User / 20% to Savique Treasury.
*   **On-Chain Realism**: Subtraction-based math (Total Balance - Principal) instead of simulated APY assumptions.



---

## 🏗️ Technical Stack

*   **Network**: Arbitrum Sepolia (Ultra-low latency, Ethereum security L2).
*   **Verification**: ProofRails SDK for cryptographically signed financial statements.
*   **Persistence**: Firebase for user profiles and professional notification routing.
*   **Standard**: OpenZeppelin-standard smart contracts for non-custodial security.

---

## ⚙️ Getting Started

1.  **Install Dependencies**: `npm install`
2.  **Environment Setup**:
    *   `FIREBASE_CONFIG`: For persistence and profiles.
    *   `RESEND_API_KEY`: For professional email notifications.
3.  **Launch**: `npm run dev`

---

The `VaultFactory` is currently deployed and verified on **Arbitrum Sepolia**:
`0x25333E809be8E9101491518abd52Ac1133137c30`

---

## 🔐 Zero-Knowledge Proof of Savings (zkArb SDK)

Proving your savings to a third party (e.g. a landlord) normally means exposing your
wallet address and full transaction history. Savique solves this with a **zero-knowledge
proof**: a user can cryptographically prove *"I have saved at least $X for at least Y months"*
**without revealing their wallet address, exact balance, or transaction history**.

This is powered by the [`zkArb SDK`](https://github.com/jatinsahijwani/zkArb-sdk) and a
pre-compiled Groth16 circuit deployed on **Arbitrum Sepolia**.

### How it works

1.  **User clicks "Share Proof"** on a savings vault (`/dashboard/savings/<address>`) and
    selects thresholds (default: $1,000, 3 months).
2.  The server-side API route (`/api/generate-proof`) reads the real savings balance from the
    `PersonalVault` contract **on-chain**, then calls the SDK's `verifyProof()`.
3.  `verifyProof()` generates a real ZK proof and **verifies it on-chain against the deployed
    verifier contract** via a read-only call — no transaction, no gas, no private key. If the
    savings are below the threshold, the proof is *mathematically impossible* to produce.
4.  Only the public metadata (thresholds, verifier contract address, timestamp) is saved to
    Firebase — **never the wallet address**.
5.  The user gets a **shareable link + QR code** (`/proof/<proofId>`). A landlord opens it to
    see a green **"Verified"** badge and an **"Audit on Blockchain"** link to the verifier
    contract on Arbiscan — all without any login.

### Key files

| File | Purpose |
|------|---------|
| `zk-integration/savings_verifier.circom` | The ZK circuit (proves `savings ≥ min` and `duration ≥ min`) |
| `zk-integration/savings_verifier/` | Pre-compiled circuit artifacts + deployed verifier (`deployment.json`) |
| `lib/zkProof.ts` | Server-side wrapper around the zkArb SDK `verifyProof()` |
| `lib/proofStore.ts` | Firestore read/write for proof metadata (no wallet address stored) |
| `app/api/generate-proof/route.ts` | API route: reads vault on-chain, generates + verifies proof |
| `components/ShareProofModal.tsx` | "Share Proof" modal (thresholds, link, QR code) |
| `app/proof/[proofId]/page.tsx` | Public landlord verification page |

### Privacy guarantees

*   The Firestore `proofs` document contains **only** thresholds, verifier contract, and
    timestamps — **no wallet address, no vault address, no balance**.
*   The exact savings amount and vault creation time are *private inputs* to the circuit and
    are never revealed — only the boolean "thresholds met" result is provable.

### 🧪 Testing the ZK functionality

A standalone test script runs the full proof flow against the deployed verifier on Arbitrum
Sepolia — **no Firebase, no wallet, and no gas required**:

```bash
PATH="$PWD/node_modules/.bin:$PATH" node zk-integration/test-proof.js
```

> The `PATH="$PWD/node_modules/.bin:$PATH"` prefix ensures the `snarkjs` CLI (which the SDK
> shells out to) is found. This happens automatically when running the app via `npm run dev`.

It exercises two cases and prints the result:

*   **PASS case** — $2,000 saved, locked 200 days, threshold $1,000 / 90 days →
    `on-chain verifier result: true`
*   **FAIL case** — $500 saved, threshold $1,000 → proof generation is **rejected** (the
    circuit is unsatisfiable, so a valid proof cannot be produced)

To test the full UI flow, add your Firebase credentials to `.env.local`, run `npm run dev`,
then use the **"Share Proof"** button on any savings vault.