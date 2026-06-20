import { getProof } from "@/lib/proofStore";
import { ShieldCheck, ShieldX, ExternalLink, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

// Arbiscan explorer for Arbitrum Sepolia.
const ARBISCAN_ADDRESS = (address: string) => `https://sepolia.arbiscan.io/address/${address}`;

function formatDuration(days: number): string {
  if (days >= 30) {
    const months = Math.round(days / 30);
    return `${months}+ month${months === 1 ? "" : "s"}`;
  }
  return `${days}+ day${days === 1 ? "" : "s"}`;
}

export default async function ProofPage({
  params,
}: {
  params: Promise<{ proofId: string }>;
}) {
  const { proofId } = await params;
  const proof = await getProof(proofId);

  if (!proof) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <ShieldX className="w-8 h-8 text-zinc-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Proof Not Found</h1>
          <p className="text-sm text-zinc-400">
            This proof link is invalid or has expired. Ask the sender for a new link.
          </p>
        </div>
      </div>
    );
  }

  const amount = proof.minAmountUsd.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const duration = formatDuration(proof.minDurationDays);
  const generatedOn = new Date(proof.currentTime * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Verified badge */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-5 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.15)]">
            <ShieldCheck className="w-10 h-10 text-green-500" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/30 px-4 py-1.5 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-semibold text-green-400">Verified</span>
          </div>
          <h1 className="text-2xl font-bold text-white leading-snug">
            Saved at least ${amount}
            <br />
            for {duration}.
          </h1>
          <p className="text-sm text-zinc-400 mt-3">
            Cryptographically verified on Arbitrum Sepolia.
          </p>
        </div>

        {/* What this means */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-zinc-300 flex gap-3 mb-6">
          <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            This is a zero-knowledge proof. The exact balance, wallet address, and transaction
            history of the saver are never revealed — only that the thresholds above were met.
          </span>
        </div>

        {/* Details */}
        <dl className="space-y-3 text-sm mb-6">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Minimum amount</dt>
            <dd className="text-white font-medium">${amount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Minimum duration</dt>
            <dd className="text-white font-medium">{duration}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Generated</dt>
            <dd className="text-white font-medium">{generatedOn}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 shrink-0">Verifier</dt>
            <dd className="text-white font-mono text-xs truncate">{proof.verifierContract}</dd>
          </div>
        </dl>

        {/* Audit on blockchain — the verifier contract that confirmed the proof */}
        {proof.verifierContract ? (
          <a
            href={ARBISCAN_ADDRESS(proof.verifierContract)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold py-3 transition-colors shadow-lg shadow-primary/20"
          >
            <ExternalLink className="w-4 h-4" />
            Audit on Blockchain
          </a>
        ) : (
          <div className="text-center text-xs text-zinc-500">
            On-chain verifier reference unavailable.
          </div>
        )}
      </div>
    </div>
  );
}
