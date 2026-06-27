# Zero-Knowledge Proofs in Savique

Savique uses zero-knowledge (ZK) proofs, powered by the zkArb SDK
(https://jatinsahijwani.github.io/zkArb-sdk/), so users can prove facts about
their savings WITHOUT revealing private financial details.

## Why this matters

When a user needs to prove financial discipline to a third party (a landlord,
a bank, an auditor), they should not have to expose their full balance or
transaction history. A ZK proof lets them share only the conclusion — for
example, "this person has saved enough and held it long enough" — and nothing else.

## What can be proven privately

- Savings goal reached: prove savings are at or above a target, without
  revealing the exact amount.
- Lock maturity: prove funds have been locked for a minimum period, without
  revealing when the lock started.
- Savings + duration together: prove both a minimum balance and a minimum
  lock duration at the same time (see the savings_verifier circuit).

## How it works (high level)

1. A small "circuit" defines exactly what is being proven (see the
   zk-integration folder).
2. The circuit is compiled and a verifier is deployed to Arbitrum with the
   zkArb SDK.
3. The app calls verifyProof(...) to generate a proof and check it on-chain.
4. The third party sees only a pass/fail result and the public thresholds —
   never the user's private numbers.

## Learn more

- zkArb SDK docs: https://jatinsahijwani.github.io/zkArb-sdk/
- zkArb SDK repo: https://github.com/jatinsahijwani/zkArb-sdk
- See also: docs/privacy.md
