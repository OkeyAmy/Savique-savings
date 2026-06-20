import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These are server-only and rely on native binaries / child_process
  // (snarkjs CLI, web3, circom). Keep them out of the bundler so the
  // generate-proof API route can require them at runtime in Node.
  serverExternalPackages: ["zkarb-sdk", "snarkjs", "web3"],
};

export default nextConfig;
