declare module "zkarb-sdk" {
  /**
   * Generates a Groth16 proof from `input` against the compiled circuit in
   * `artifactsPath`, then verifies it on the deployed Solidity verifier
   * (read-only eth_call). Throws if the circuit is unsatisfiable.
   */
  export function verifyProof(
    input: Record<string, string | number | bigint>,
    artifactsPath: string
  ): Promise<{ result: boolean; publicSignals: string[] }>;

  export function compileCircuit(...args: unknown[]): Promise<unknown>;
  export function testCircuit(...args: unknown[]): Promise<unknown>;
  export function deployVerifier(...args: unknown[]): Promise<unknown>;
}
