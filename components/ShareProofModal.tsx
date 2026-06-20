"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, ShieldCheck, Loader2, Copy, Check, ExternalLink, Lock } from "lucide-react";
import { useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACTS, ERC20_ABI } from "@/lib/contracts";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface ShareProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultAddress: `0x${string}`;
}

const DURATION_OPTIONS = [
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
];

const SECONDS_PER_MONTH = 30 * 24 * 60 * 60; // 2,592,000

const toastStyle = {
  className: "bg-[#E62058]/10 border-[#E62058]/20 text-[#E62058]",
  style: {
    backgroundColor: "rgba(230, 32, 88, 0.1)",
    borderColor: "rgba(230, 32, 88, 0.2)",
    color: "#E62058",
  },
};

export function ShareProofModal({ isOpen, onClose, vaultAddress }: ShareProofModalProps) {
  const [minAmountUsd, setMinAmountUsd] = useState("1000");
  const [months, setMonths] = useState(3);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // USDC decimals are read on-chain so the threshold is converted to the exact
  // base-unit precision the circuit expects.
  const { data: decimals } = useReadContract({
    address: CONTRACTS.arbitrumSepolia.USDCToken,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  const handleGenerate = async () => {
    setError(null);

    const amount = parseFloat(minAmountUsd);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setIsGenerating(true);
    try {
      const minAmount = parseUnits(minAmountUsd, (decimals as number) ?? 6).toString();
      const minDuration = months * SECONDS_PER_MONTH;

      const res = await fetch("/api/generate-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultAddress, minAmount, minDuration }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate proof.");
      }

      const url = `${window.location.origin}/proof/${data.proofId}`;
      setProofUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate proof.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!proofUrl) return;
    await navigator.clipboard.writeText(proofUrl);
    setCopied(true);
    toast.success("Link copied", toastStyle);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    // Reset so the modal opens fresh next time.
    setProofUrl(null);
    setError(null);
    setIsGenerating(false);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-zinc-900 border border-white/10 text-white rounded-2xl w-full max-w-lg m-4 p-6 relative shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
          disabled={isGenerating}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Share a Proof of Savings</h2>
          <p className="text-sm text-zinc-400">
            Prove you&apos;ve saved a minimum amount for a minimum time — without revealing your
            wallet, balance, or transaction history.
          </p>
        </div>

        {!proofUrl ? (
          <>
            <div className="space-y-5">
              {/* Minimum amount */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Minimum Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    min="0"
                    value={minAmountUsd}
                    onChange={(e) => setMinAmountUsd(e.target.value)}
                    disabled={isGenerating}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-white focus:outline-none focus:border-primary/50 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Minimum duration */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Minimum Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.months}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setMonths(opt.months)}
                      className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                        months === opt.months
                          ? "bg-primary/15 border-primary/50 text-white"
                          : "bg-black/40 border-white/10 text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-zinc-300 flex gap-3">
                <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  I will prove I have saved at least{" "}
                  <span className="font-bold text-white">
                    ${(parseFloat(minAmountUsd) || 0).toLocaleString()}
                  </span>{" "}
                  for at least{" "}
                  <span className="font-bold text-white">{months} months</span>.
                </span>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-6">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating proof on Arbitrum…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Generate Proof
                  </>
                )}
              </Button>
              {isGenerating && (
                <p className="text-center text-xs text-zinc-500 mt-3">
                  Generating the zero-knowledge proof and verifying it on-chain. This can take a few
                  seconds.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center">
              <p className="text-sm font-medium text-green-400">
                Proof generated and verified on Arbitrum Sepolia.
              </p>
            </div>

            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={proofUrl} size={176} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Shareable Link
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={proofUrl}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono truncate focus:outline-none"
                />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="h-auto px-3 rounded-lg shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="ghost" className="w-full border border-white/10 hover:bg-white/5">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open verification page
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
