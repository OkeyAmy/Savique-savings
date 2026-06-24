# Introduction

> **Savique** — A Professional Savings Commitment Protocol for high-conviction, on-chain wealth building.

Savique is a premium, disciplined, on-chain savings platform that bridges the gap
between decentralized assets and real-world financial maturity. It turns a wallet —
which is optimized for instant, frictionless spending — into a **strategic commitment
layer** for capital, backed by cryptographic commitments, verifiable audit trails, and
zero-knowledge privacy.

---

## The Problem

Modern digital wealth is engineered for high liquidity, and that liquidity quietly works
against long-term goals:

- **Financial indiscretion.** Traditional wallets make it too easy to "dip into" funds
  earmarked for rent, taxes, business capital, or a property deposit. There is no friction
  protecting you from your own impulses.
- **No verifiable history.** When a user needs to prove financial stability to a third
  party — a landlord, an auditor, a bank — a raw wallet balance is not enough. It carries
  no standardized, tamper-proof history of disciplined saving over time, so traditional
  institutions reject it.
- **Privacy vs. proof.** The naive way to "prove" savings is to hand over your wallet
  address and let the other party inspect your entire on-chain history. That exposes your
  exact balance, every transaction, and your identity — far more than anyone needs to know.

## The Solution

Savique introduces a **Strategic Commitment Layer** that moves capital beyond simple
storage:

1. **Enforced discipline.** Funds are cryptographically sealed for a user-defined lock-up
   period inside a non-custodial smart-contract vault, removing the temptation of impulsive
   spending.
2. **On-chain receipt system.** Every action produces an immutable receipt tied directly to
   an Arbitrum transaction hash — a standardized, tamper-proof audit trail.
3. **Zero-knowledge proof of savings.** A user can prove *"I have saved at least $X for at
   least Y months"* to any third party **without revealing their wallet address, exact
   balance, or transaction history** (see [Privacy](./privacy.md)).
4. **Real-world utility.** Users can present a verifiable Transaction History Dashboard, or a
   single shareable proof link, as cryptographic evidence of financial discipline and capital
   retention over time.

---

## Core Capabilities

### Sinking Fund Protocol (Goal Tracking)
Set specific financial targets (e.g. *"Property Deposit"*, *"Emergency Fund"*) and track
progress toward them in real time.

### Flexible Top-Ups
"Fuel" an active goal by adding funds to any plan at any time — compounding your commitment
without resetting or extending the original lock-up period.

### Emergency Beneficiary Protocol (Inheritance)
Designate an emergency beneficiary address. If the owner becomes inactive after the lock
period ends, the protocol provides a safe recovery path so capital is never lost to the void.

### Professional Notification System
An automated notification layer sends transaction confirmations, maturity alerts, and
security warnings (e.g. unauthorized early-withdrawal attempts) over email.

### Financial Intelligence & TVL Dashboard
A visual command center for Total Value Locked (TVL), proof-of-reserves transparency, and a
categorized view of all financial proofs and receipts.

### Yield-Sharing Engine
Every deposit is productive capital. Funds are supplied to **Aave V3** and earn real yield,
computed with subtraction-based accounting (`totalAssets − principal`) rather than simulated
APY. At maturity the realized profit is split **80% to the user / 20% to the Savique
treasury**.

### Zero-Knowledge Proof of Savings
Powered by the [`zkArb SDK`](https://github.com/jatinsahijwani/zkArb-sdk) and a pre-compiled
Groth16 circuit deployed on Arbitrum Sepolia. This is Savique's flagship privacy feature and
is documented in detail in **[privacy.md](./privacy.md)**.

---

## Technology at a Glance

| Layer           | Choice                                                            |
| --------------- | ----------------------------------------------------------------- |
| Network         | **Arbitrum Sepolia** (low-latency, Ethereum-secured L2)           |
| Smart contracts | Solidity `^0.8.20`, OpenZeppelin standards, Hardhat toolchain     |
| Frontend        | Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion |
| Wallet / chain  | wagmi, viem, RainbowKit                                           |
| Yield           | Aave V3 pool integration                                          |
| Privacy         | `zkarb-sdk` + Groth16 circuit (`savings_verifier`)                |
| Persistence     | Firebase / Firestore (profiles, receipts, proof metadata)         |
| Notifications   | Nodemailer / Resend email delivery                                |

See **[architecture.md](./architecture.md)** for how these layers fit together.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
#    FIREBASE_CONFIG            – persistence & profiles
#    RESEND_API_KEY             – professional email notifications
#    ARBITRUM_SEPOLIA_RPC_URL   – (optional) custom RPC endpoint

# 3. Run the dev server
npm run dev
```

### Deployed Contracts (Arbitrum Sepolia)

| Contract                 | Address                                      |
| ------------------------ | -------------------------------------------- |
| VaultFactory             | `0x059652D26C7653278896D3DF7286EAaDE7a60b15` |
| USDC (test token)        | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Aave Pool                | `0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff` |
| ZK Savings Verifier      | `0xc7CfEEb82aAb351359B8AaD5c5522b346567Ee79` |

---

## Document Map

- **[Introduction.md](./Introduction.md)** — what Savique is, the problem, and the features (this file).
- **[architecture.md](./architecture.md)** — system design, contracts, data flow, and project layout.
- **[privacy.md](./privacy.md)** — the zero-knowledge (zkArb SDK) privacy model in depth.
