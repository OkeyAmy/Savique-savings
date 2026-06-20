"use client";

import { Button } from "@/components/ui/button";
import { Wallet, Loader2, ArrowUpCircle, X } from "lucide-react";
import { formatUnits } from "viem";
import { SavedVault } from "@/lib/receiptService";

interface VaultTopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    vaultData: SavedVault | null;
    balance: string;
    userBalance: bigint | undefined;
    decimals: number | undefined;
    topUpStep: 'idle' | 'approving' | 'depositing' | 'done';
    isConfirming: boolean;
    isFiatLoading: boolean;
    topUpAmount: string;
    setTopUpAmount: (val: string) => void;
    selectedTopUpTab: 'usdc' | 'fiat';
    setSelectedTopUpTab: (tab: 'usdc' | 'fiat') => void;
    handleTopUp: () => void;
}

export function VaultTopUpModal({
    isOpen,
    onClose,
    vaultData,
    balance,
    userBalance,
    decimals,
    topUpStep,
    isConfirming,
    isFiatLoading,
    topUpAmount,
    setTopUpAmount,
    selectedTopUpTab,
    setSelectedTopUpTab,
    handleTopUp
}: VaultTopUpModalProps) {
    if (!isOpen) return null;

    const remainingGoal = vaultData?.targetAmount
        ? parseFloat((parseFloat(vaultData.targetAmount) - parseFloat(balance)).toFixed(6))
        : 0;

    const isExceedingGoal = !!(vaultData?.targetAmount &&
        parseFloat(vaultData.targetAmount) > 0 &&
        parseFloat(parseFloat(topUpAmount || "0").toFixed(2)) > parseFloat(remainingGoal.toFixed(2)));

    const handleConfirm = () => {
        handleTopUp();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/10 text-white rounded-2xl w-full max-w-md m-4 p-6 relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                    disabled={topUpStep !== 'idle' || isConfirming || isFiatLoading}
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">Top Up Savings</h2>
                    <p className="text-xs text-zinc-400">
                        Add funds to help reach your savings goal faster.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-2">
                            <Wallet className="w-3 h-3 text-primary" />
                            Funding Method
                        </label>
                        <div className="flex bg-black/40 px-1 py-1 rounded-xl border border-white/5">
                            <button
                                type="button"
                                onClick={() => setSelectedTopUpTab('usdc')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${selectedTopUpTab === 'usdc' ? 'bg-primary text-white' : 'text-gray-500'}`}
                            >
                                USDC
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedTopUpTab('fiat')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${selectedTopUpTab === 'fiat' ? 'bg-primary text-white' : 'text-gray-500'}`}
                            >
                                Fiat / Credit Card
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-zinc-500">Amount to Add</span>
                            {userBalance !== undefined && selectedTopUpTab === 'usdc' && (
                                <span className="text-zinc-400">Bal: {formatUnits(userBalance, decimals || 18)} USDC</span>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder={selectedTopUpTab === 'fiat' ? "Enter exact USDC amount to buy" : "0.00"}
                                disabled={topUpStep !== 'idle' || isConfirming || isFiatLoading}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={topUpAmount}
                                onChange={(e) => setTopUpAmount(e.target.value)}
                            />
                        </div>
                        {isExceedingGoal && (
                            <p className="text-xs text-red-500">Amount exceeds remaining goal of {remainingGoal.toFixed(2)} USDC</p>
                        )}
                    </div>

                    <div className="pt-2">
                        <Button
                            className="w-full h-10 rounded-lg text-sm font-semibold"
                            onClick={handleConfirm}
                            disabled={topUpStep !== 'idle' || isConfirming || isFiatLoading || !topUpAmount || isExceedingGoal}
                        >
                            {(topUpStep === 'approving' || topUpStep === 'depositing' || isConfirming || isFiatLoading) ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <ArrowUpCircle className="w-4 h-4 mr-2" />
                            )}
                            {topUpStep === 'approving' ? 'Approving USDC...' : (topUpStep === 'depositing' || isConfirming) ? 'Processing...' : 'Confirm Deposit'}
                        </Button>
                        {vaultData?.targetAmount && (
                            <p className="text-[11px] text-zinc-500 mt-3">
                                Remaining goal: <span className="text-zinc-300 font-semibold">{remainingGoal > 0 ? remainingGoal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"} USDC</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
