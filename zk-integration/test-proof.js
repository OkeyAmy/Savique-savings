/**
 * Standalone test for the zkArb SDK proof flow — no Firebase, no wallet, no gas.
 *
 * Run from the project root with snarkjs on PATH:
 *   PATH="$PWD/node_modules/.bin:$PATH" node zk-integration/test-proof.js
 *
 * It exercises two cases against the pre-deployed verifier on Arbitrum Sepolia:
 *   1. PASS  — savings/duration meet the thresholds        -> result: true
 *   2. FAIL  — savings below threshold (circuit unsatisfiable) -> throws
 */
const path = require("path");
const { verifyProof } = require("zkarb-sdk");

const ARTIFACTS = path.join(__dirname, "savings_verifier");
const now = Math.floor(Date.now() / 1000);
const USDC = (dollars) => (BigInt(dollars) * 1000000n).toString(); // 6 decimals

async function main() {
  console.log("\n=== PASS CASE: $2,000 saved, locked 200 days; threshold $1,000 / 90 days ===");
  const pass = await verifyProof(
    {
      savings_amount: USDC(2000),
      lock_start: String(now - 200 * 86400),
      min_amount: USDC(1000),
      min_duration: String(90 * 86400),
      current_time: String(now),
    },
    ARTIFACTS
  );
  console.log("on-chain verifier result:", pass.result);
  console.log("public signals [min_amount, min_duration, current_time]:", pass.publicSignals);

  console.log("\n=== FAIL CASE: $500 saved; threshold $1,000 (cannot produce a valid proof) ===");
  try {
    await verifyProof(
      {
        savings_amount: USDC(500),
        lock_start: String(now - 200 * 86400),
        min_amount: USDC(1000),
        min_duration: String(90 * 86400),
        current_time: String(now),
      },
      ARTIFACTS
    );
    console.log("UNEXPECTED: a proof was produced for below-threshold savings");
  } catch (e) {
    console.log("correctly rejected:", (e.message || String(e)).split("\n")[0]);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
