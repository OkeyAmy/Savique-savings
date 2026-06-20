pragma circom 2.0.0;

include "comparators.circom";

// ─────────────────────────────────────────────────────────────────────────────
// SavingsVerifier
//
// Proves:
//   savings_amount  >=  min_amount
//   (current_time - lock_start)  >=  min_duration
//
// Without revealing:
//   - savings_amount   (actual USDC balance)
//   - lock_start       (vault creation timestamp)
//
// Public inputs visible to the landlord:
//   - min_amount    (the threshold the user chose, e.g. 1_000_000 for $1 USDC-base)
//   - min_duration  (the duration threshold in seconds, e.g. 7_776_000 for 90 days)
//   - current_time  (unix timestamp at proof generation)
//
// The proof is cryptographically UNSATISFIABLE if either condition fails —
// meaning it is mathematically impossible to produce a valid proof without
// actually meeting both thresholds.
// ─────────────────────────────────────────────────────────────────────────────

template SavingsVerifier() {
    // ── Private inputs (never revealed) ──────────────────────────────────────
    signal input savings_amount;  // USDC balance in base units (check token decimals)
    signal input lock_start;      // unix timestamp (seconds) when vault was created

    // ── Public inputs (visible to verifier / landlord) ────────────────────────
    signal input min_amount;      // minimum savings threshold in same units as savings_amount
    signal input min_duration;    // minimum lock duration in seconds
    signal input current_time;    // current unix timestamp (seconds) at time of proof

    // ── Compute elapsed time ──────────────────────────────────────────────────
    signal elapsed;
    elapsed <== current_time - lock_start;

    // ── Check savings_amount >= min_amount ────────────────────────────────────
    component amt_check = GreaterEqThan(64);
    amt_check.in[0] <== savings_amount;
    amt_check.in[1] <== min_amount;

    // ── Check elapsed >= min_duration ─────────────────────────────────────────
    component dur_check = GreaterEqThan(64);
    dur_check.in[0] <== elapsed;
    dur_check.in[1] <== min_duration;

    // ── Hard constraints: proof is invalid if either condition fails ───────────
    // These lines make the circuit UNSATISFIABLE if the conditions aren't met.
    // A prover cannot generate a valid proof unless both === 1.
    amt_check.out === 1;
    dur_check.out === 1;
}

// min_amount, min_duration, and current_time are PUBLIC (visible to the verifier).
// savings_amount and lock_start are PRIVATE (hidden from the verifier).
component main {public [min_amount, min_duration, current_time]} = SavingsVerifier();