"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Zap,
  Lock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Clock,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

interface Withdrawal {
  id: string;
  amountInr: number;
  bufferedInr: number;
  usdtAmount: number;
  network: string;
  walletAddress: string;
  txHash?: string;
  status: "PROCESSING" | "FINISHED" | "FAILED";
  errorMessage?: string;
  createdAt: string;
}

export default function WithdrawPage() {
  const { data: session, update } = useSession();
  const walletBalance = Number((session?.user as any)?.walletBalance ?? 0);
  const minThreshold = 100;
  const isUnlocked = walletBalance >= minThreshold;

  const [walletAddress, setWalletAddress] = useState("");
  const [amountInr, setAmountInr] = useState<string>("");
  const [usdtRate, setUsdtRate] = useState<number>(90.5);
  const bufferPercent = 6.0;

  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
    txHash?: string;
  } | null>(null);

  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Set default amount when balance loads
  useEffect(() => {
    if (walletBalance >= minThreshold && !amountInr) {
      setAmountInr(String(Math.floor(walletBalance)));
    }
  }, [walletBalance, amountInr]);

  // Fetch USDT/INR live rate and settings
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.setting?.usdtInrRate) {
          setUsdtRate(data.setting.usdtInrRate);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch withdrawal history
  const fetchWithdrawals = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/withdrawals");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.withdrawals || []);
      }
    } catch (err) {
      console.error("Failed to load withdrawals:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  // Calculated preview values
  const numericAmount = parseFloat(amountInr) || 0;
  const bufferedAmountInr = Number(
    (numericAmount * (1 + bufferPercent / 100)).toFixed(2)
  );
  const estimatedUsdt =
    usdtRate > 0 ? Number((bufferedAmountInr / usdtRate).toFixed(4)) : 0;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = walletAddress.trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setMessage({
        type: "error",
        text: "Please enter a valid 42-character Polygon (EVM) address starting with 0x.",
      });
      return;
    }

    if (numericAmount < minThreshold) {
      setMessage({
        type: "error",
        text: `Minimum withdrawal is ₹${minThreshold}.`,
      });
      return;
    }

    if (numericAmount > walletBalance) {
      setMessage({
        type: "error",
        text: `Insufficient balance! You have ₹${walletBalance.toFixed(
          2
        )}, requested ₹${numericAmount}.`,
      });
      return;
    }

    try {
      setWithdrawing(true);
      setMessage(null);

      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          amountInr: numericAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Withdrawal failed");
      }

      setMessage({
        type: "success",
        text: `Instant payout sent! Sent ${data.withdrawal.usdtAmount} USDT (Polygon) to ${address}.`,
        txHash: data.withdrawal.txHash,
      });

      // Update session balance
      const newBalance = Math.max(0, walletBalance - numericAmount);
      update({ walletBalance: newBalance });

      // Refresh withdrawal history
      fetchWithdrawals();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Withdrawal request failed",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Wallet className="h-6 w-6 text-emerald-400" />
          <span>Instant USDT (Polygon) Withdrawal</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Automated crypto payouts via NOWPayments Mass Payouts API. Zero bank freezes, zero manual delays, 24x7 instant dispatch.
        </p>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`flex flex-col gap-2 rounded-xl p-4 text-sm font-medium border ${
            message.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/60 border-rose-500/40 text-rose-300"
          }`}
        >
          <div className="flex items-start gap-3">
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-xs hover:underline text-slate-400"
            >
              Dismiss
            </button>
          </div>
          {message.txHash && (
            <a
              href={`https://polygonscan.com/tx/${message.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 underline hover:text-emerald-300 pl-8"
            >
              <span>View transaction on Polygonscan: {message.txHash.slice(0, 16)}...</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Locked / Unlocked State Card */}
      {!isUnlocked ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Withdrawal Locked (Requires Minimum ₹{minThreshold})
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Your current balance is{" "}
                <strong className="text-amber-300 font-mono text-sm">
                  ₹{walletBalance.toFixed(0)}
                </strong>
                . You need{" "}
                <strong className="text-white">
                  ₹{(minThreshold - walletBalance).toFixed(0)} more
                </strong>{" "}
                to unlock instant USDT cashouts.
              </p>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((walletBalance / minThreshold) * 100)
                )}%`,
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/dashboard/tasks"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 transition-all"
            >
              <span>Complete Review Tasks (+₹10 each)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              href="/dashboard/transfer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-slate-700 transition-colors"
            >
              <span>Pool Balances from Other Google Accounts (₹0 Fee)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Withdrawal Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Zap className="h-5 w-5 fill-emerald-400" />
                  <h2 className="text-base font-bold text-white">
                    Request Automated Payout
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Balance:{" "}
                  <strong className="text-emerald-400 text-sm">
                    ₹{walletBalance.toFixed(0)}
                  </strong>
                </span>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-5">
                {/* Polygon Address Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-200">
                      Polygon (MATIC) USDT Deposit Address
                    </label>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      Network: Polygon (ERC-20 / EVM)
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="0x71C... (Copy from CoinDCX, Mudrex, or Trust Wallet)"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white font-mono placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Must be your deposit address for <strong>USDT on Polygon (MATIC) network</strong>. Do NOT use Ethereum (ERC20) or Tron (TRC20) addresses.
                  </p>
                </div>

                {/* Amount Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-200">
                      Withdraw Amount (₹ INR)
                    </label>
                    <button
                      type="button"
                      onClick={() => setAmountInr(String(Math.floor(walletBalance)))}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      Full Balance (₹{walletBalance.toFixed(0)})
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min={minThreshold}
                      max={walletBalance}
                      value={amountInr}
                      onChange={(e) => setAmountInr(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-3.5 py-3 text-sm text-white font-mono placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Live Buffer & Conversion Breakdown Box */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Base Cashout Amount:</span>
                    <span className="font-mono font-bold text-white">
                      ₹{numericAmount.toFixed(0)} INR
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>+6% Bank Cash-Out Buffer (Paid by Platform):</span>
                    </span>
                    <span className="font-mono font-bold">
                      +₹{(numericAmount * 0.06).toFixed(2)} INR
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span>Total Buffered INR Dispatched:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      ₹{bufferedAmountInr.toFixed(2)} INR
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
                    <span>USDT / INR Live Conversion Rate:</span>
                    <span className="font-mono">₹{usdtRate.toFixed(2)} / USDT</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-sm">
                    <span className="font-bold text-white">
                      You Receive (Polygon USDT):
                    </span>
                    <span className="font-mono font-extrabold text-emerald-400 text-base">
                      ~{estimatedUsdt.toFixed(4)} USDT
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                    *Why the 6% buffer? When you sell this USDT in your Indian crypto app (CoinDCX/Mudrex) for INR, the 6% buffer covers the 1% TDS and exchange spread, ensuring <strong>₹{numericAmount.toFixed(0)}+ hits your bank account</strong>.
                  </p>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={withdrawing || numericAmount < minThreshold || numericAmount > walletBalance}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {withdrawing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing Instant NOWPayments Payout...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 fill-white" />
                      <span>Withdraw Instantly to Polygon</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Indian Crypto App Guide */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <HelpCircle className="h-4 w-4 text-emerald-400" />
                <span>How to Cash Out into Bank Account</span>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <strong className="text-emerald-400 block font-semibold">
                    Step 1: Get Polygon USDT Address
                  </strong>
                  <p className="text-slate-400 text-[11px]">
                    Open <strong>CoinDCX, Mudrex, CoinSwitch, or Trust Wallet</strong>. Search for <strong>USDT</strong> → Click <strong>Deposit / Receive</strong> → Select <strong>Polygon Network (MATIC)</strong> → Copy the 0x address.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <strong className="text-emerald-400 block font-semibold">
                    Step 2: Instant Payout
                  </strong>
                  <p className="text-slate-400 text-[11px]">
                    Paste your address above and click Withdraw. NOWPayments dispatches USDT in ~15 to 60 seconds with ~₹0.20 network fee paid by us.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <strong className="text-emerald-400 block font-semibold">
                    Step 3: Transfer to Bank
                  </strong>
                  <p className="text-slate-400 text-[11px]">
                    Once USDT arrives in CoinDCX / Mudrex, click <strong>Sell USDT for INR</strong> → click <strong>Withdraw INR to Bank</strong>. ₹100+ lands in your account immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout History Ledger */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>Payout History</span>
          </h2>
          <span className="text-xs text-slate-400">
            {history.length} withdrawal{history.length !== 1 ? "s" : ""}
          </span>
        </div>

        {historyLoading ? (
          <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
            Loading payout history...
          </div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No withdrawal history yet. Reach ₹100 to make your first withdrawal!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Amount (INR)</th>
                  <th className="pb-3 font-semibold">USDT Dispatched</th>
                  <th className="pb-3 font-semibold">Polygon Address</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Blockchain Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850/50">
                    <td className="py-3 text-slate-300 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString()}{" "}
                      <span className="text-slate-500">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-white">
                      ₹{item.amountInr.toFixed(0)}{" "}
                      <span className="text-[10px] text-emerald-400">
                        (+₹{(item.bufferedInr - item.amountInr).toFixed(1)} buffer)
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-emerald-400">
                      {item.usdtAmount.toFixed(4)} USDT
                    </td>
                    <td className="py-3 font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                      {item.walletAddress.slice(0, 6)}...{item.walletAddress.slice(-4)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          item.status === "FINISHED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : item.status === "PROCESSING"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {item.txHash ? (
                        <a
                          href={`https://polygonscan.com/tx/${item.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:text-emerald-300 text-[11px] underline"
                        >
                          <span>{item.txHash.slice(0, 8)}...</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">
                          Pending batch
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
