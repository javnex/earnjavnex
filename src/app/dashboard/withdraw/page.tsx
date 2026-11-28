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
  Sparkles,
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
  const { data: session, status, update } = useSession();
  const walletBalance = Number((session?.user as any)?.walletBalance ?? 0);
  const minThreshold = 100;
  const isUnlocked = walletBalance >= minThreshold;

  const [walletAddress, setWalletAddress] = useState("");
  const [network, setNetwork] = useState<"BSC" | "POLYGON">("BSC");
  const [amountInr, setAmountInr] = useState<string>("");
  const [usdtRate, setUsdtRate] = useState<number>(90.5);
  const [bufferPercent, setBufferPercent] = useState<number>(14.0);

  // Auto-load saved wallet address from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`rr_saved_wallet_${network}`);
      if (saved) {
        setWalletAddress(saved);
      }
    } catch {}
  }, [network]);

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
        if (data?.setting?.cashoutBufferPercent) {
          setBufferPercent(data.setting.cashoutBufferPercent);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch withdrawal history
  const fetchWithdrawals = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/withdrawals", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.withdrawals || []);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to load withdrawals:", err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchWithdrawals();
    } else if (status === "unauthenticated") {
      setHistory([]);
      setHistoryLoading(false);
    }
  }, [status]);

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

    if (!address.startsWith("0x") || address.length < 30) {
      setMessage({
        type: "error",
        text: "Please enter a valid Polygon (MATIC) EVM wallet address starting with 0x.",
      });
      return;
    }

    if (numericAmount < minThreshold) {
      setMessage({
        type: "error",
        text: `Minimum withdrawal amount is ₹${minThreshold} INR.`,
      });
      return;
    }

    if (numericAmount > walletBalance) {
      setMessage({
        type: "error",
        text: "Insufficient wallet balance.",
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
          amountInr: numericAmount,
          walletAddress: address,
          network,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Withdrawal failed");
      }

      // Save address for 1-click future cashouts
      try {
        localStorage.setItem(`rr_saved_wallet_${network}`, address);
      } catch {}

      setMessage({
        type: "success",
        text: `Instant payout sent! Dispatched ${data.withdrawal.usdtAmount} USDT (${network === "BSC" ? "CoinDCX / BSC" : "Polygon"}) to ${address}.`,
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
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <Wallet className="h-6 w-6 text-blue-600" />
          <span>Instant USDT (Polygon) Terminal</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Automated crypto payouts via NOWPayments Mass Payouts API. Zero bank freezes, 24x7 instant dispatch.
        </p>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`flex flex-col gap-2 rounded-2xl p-4 text-xs font-medium border shadow-xs ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-start gap-3">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-xs hover:underline text-slate-500 hover:text-slate-900 font-mono cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          {message.txHash && (
            <a
              href={`https://polygonscan.com/tx/${message.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-700 underline pl-7 font-bold"
            >
              <span>View transaction on Polygonscan: {message.txHash.slice(0, 16)}...</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Locked / Unlocked State Card */}
      {!isUnlocked ? (
        <div className="glare-card rounded-3xl p-6 sm:p-8 space-y-5 bg-white border border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Withdrawal Locked (Requires Minimum ₹{minThreshold})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Your current balance is{" "}
                <strong className="text-slate-900 font-mono text-sm">
                  ₹{walletBalance.toFixed(0)}
                </strong>
                . You need{" "}
                <strong className="text-blue-600 font-mono">
                  ₹{(minThreshold - walletBalance).toFixed(0)} more
                </strong>{" "}
                to unlock instant withdraw.
              </p>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
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
              className="btn-futuristic inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <span>Complete Available Tasks</span>
              <ArrowRight className="h-3.5 w-3.5 text-white" />
            </Link>

            <Link
              href="/dashboard/transfer"
              className="btn-futuristic-glass inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-slate-700 hover:text-blue-600 cursor-pointer"
            >
              <span>Pool Balances from Secondary Accounts (₹0 Fee)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Withdrawal Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glare-card rounded-2xl p-6 space-y-6 bg-white border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2 text-slate-900">
                  <Zap className="h-4 w-4 fill-blue-600 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Request Automated Payout
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Balance:{" "}
                  <strong className="text-emerald-700 text-sm font-bold">
                    ₹{walletBalance.toFixed(0)}
                  </strong>
                </span>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-5">
                {/* Network Selection (CoinDCX BSC vs Polygon) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 font-mono block">
                    Select Payout Network & Destination:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNetwork("BSC")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        network === "BSC"
                          ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-slate-900">
                          CoinDCX (BSC / BEP-20)
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                          Direct Bank Withdraw
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Direct deposit to CoinDCX for instant INR bank withdrawal via IMPS/UPI.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNetwork("POLYGON")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        network === "POLYGON"
                          ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-slate-900">
                          Polygon (POL / MATIC)
                        </span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                          Web3 / Binance
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Direct to Binance, MetaMask, Trust Wallet on the Polygon network.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Address Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700 font-mono">
                      {network === "BSC"
                        ? "CoinDCX (BSC / BEP-20) USDT Address"
                        : "Polygon (MATIC) USDT Address"}
                    </label>
                    <span className="text-[11px] text-blue-600 font-mono font-bold">
                      {network === "BSC" ? "Network: BNB Smart Chain (BEP-20)" : "Network: Polygon POS"}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={
                      network === "BSC"
                        ? "0x... (Copy USDT deposit address from CoinDCX - select BSC / BEP-20)"
                        : "0x... (Copy from Binance, Trust Wallet, or MetaMask - Polygon)"
                    }
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="futuristic-input w-full rounded-xl px-3.5 py-3 text-xs text-slate-900 font-mono placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-500">
                    {network === "BSC" ? (
                      <span>
                        In CoinDCX: Go to <strong>Deposit Crypto → USDT → Select BSC (BEP-20) network</strong>. Copy your 0x address and paste it here.
                      </span>
                    ) : (
                      <span>
                        Must be your deposit address for <strong>USDT on Polygon network</strong>.
                      </span>
                    )}
                  </p>
                  {walletAddress && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-mono pt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Address is saved on this device for 1-click future withdrawals.</span>
                    </div>
                  )}
                </div>

                {/* Amount Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700 font-mono">
                      Withdraw Amount (₹ INR)
                    </label>
                    <button
                      type="button"
                      onClick={() => setAmountInr(String(Math.floor(walletBalance)))}
                      className="text-[11px] text-blue-600 hover:underline font-mono transition-colors cursor-pointer"
                    >
                      Full Balance (₹{walletBalance.toFixed(0)})
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400 font-bold font-mono">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min={minThreshold}
                      max={walletBalance}
                      value={amountInr}
                      onChange={(e) => setAmountInr(e.target.value)}
                      className="futuristic-input w-full rounded-xl pl-8 pr-3.5 py-3 text-xs text-slate-900 font-mono placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Live Buffer & Conversion Breakdown Box (Trust Blue & Green Accents) */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-700 font-mono">
                    <span>Base Withdraw Amount:</span>
                    <span className="font-bold text-slate-900">
                      ₹{numericAmount.toFixed(0)} INR
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-emerald-800 font-mono">
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                      <span>+{bufferPercent}% Exchange & Bank Fee Buffer (Paid by Platform):</span>
                    </span>
                    <span className="font-bold text-emerald-700">
                      +₹{((numericAmount * bufferPercent) / 100).toFixed(2)} INR
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700 font-mono">
                    <span>Total Buffered INR Dispatched:</span>
                    <span className="font-bold text-slate-900">
                      ₹{bufferedAmountInr.toFixed(2)} INR
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-blue-200 font-mono">
                    <span>USDT / INR Live Conversion Rate:</span>
                    <span>₹{usdtRate.toFixed(2)} / USDT</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-blue-200 text-sm font-mono">
                    <span className="font-bold text-blue-950">
                      You Receive ({network === "BSC" ? "CoinDCX BSC USDT" : "Polygon USDT"}):
                    </span>
                    <span className="font-black text-blue-700 text-base">
                      ~{estimatedUsdt.toFixed(4)} USDT
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-600 pt-1 leading-relaxed font-sans">
                    *The +{bufferPercent}% platform buffer fully offsets CoinDCX&apos;s 1% TDS, trading fee, and the ₹10 bank IMPS fee, ensuring <strong>₹{numericAmount.toFixed(0)}+ lands net in your bank account</strong>.
                  </p>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={withdrawing || numericAmount < minThreshold || numericAmount > walletBalance}
                  className="btn-futuristic w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold text-white shadow-xl shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {withdrawing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Processing Instant NOWPayments Payout...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 fill-white text-white" />
                      <span>{network === "BSC" ? "Withdraw Instantly to CoinDCX (Bank IMPS)" : "Withdraw Instantly via Polygon"}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: CoinDCX Official Partner Card & Referral */}
          <div className="space-y-6">
            <div className="glare-card rounded-2xl p-5 space-y-4 bg-gradient-to-b from-blue-50/80 via-white to-white border border-blue-200 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs font-black text-xs">
                    ₹
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      CoinDCX Indian Bank Withdraw
                    </h3>
                    <p className="text-[10px] text-blue-600 font-bold">
                      Required for Direct IMPS/UPI Bank Transfers
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs tabular-nums">
                  +₹{Math.round(numericAmount * (bufferPercent / 100))} Bonus Buffer
                </span>
              </div>

              {/* Extra ₹10+ Buffer Notice */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Get Extra ₹{Math.round(numericAmount * (bufferPercent / 100))}+ in Your Wallet</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed font-sans">
                  We automatically add a <strong>+{bufferPercent}% extra buffer</strong> onto your withdrawal to cover CoinDCX&apos;s 1% TDS, trading fee, and the ₹10 bank IMPS fee so you get <strong>₹100+ net in your bank account</strong>.
                </p>
              </div>

              {/* Special CoinDCX Promotion Card */}
              <div className="rounded-xl border border-blue-300 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-4 text-white space-y-2.5 shadow-md shadow-blue-500/20">
                <div className="flex items-center gap-1.5 text-amber-300 text-xs font-black uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 fill-amber-300" />
                  <span>Limited Time CoinDCX Offer</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold leading-snug">
                    Limited time: ₹10L worth of BTC rewards up for grabs! 🚀
                  </p>
                  <p className="text-[11px] text-blue-100 leading-relaxed">
                    Trade Spot or Futures on CoinDCX and win assured Bitcoin rewards worth up to ₹10L.
                  </p>
                </div>
                <div className="pt-1">
                  <a
                    href="https://invite.coindcx.com/03498174"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-blue-900 font-black px-4 py-2.5 text-xs shadow-md hover:bg-blue-50 transition-all cursor-pointer"
                  >
                    <span>Tap Here to Join CoinDCX</span>
                    <ExternalLink className="h-3.5 w-3.5 text-blue-700" />
                  </a>
                </div>
                <p className="text-[10px] text-blue-200 text-center italic">
                  Let&apos;s make your first step the right one! 🚀
                </p>
              </div>

              {/* 3 Steps Guide to Cashout via CoinDCX */}
              <div className="space-y-2.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  3 Easy Steps to Withdraw to Bank:
                </span>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <strong className="text-slate-900 font-bold flex items-center gap-1.5">
                    <span className="flex h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] items-center justify-center">1</span>
                    Create / Open CoinDCX
                  </strong>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Tap the link above to register your CoinDCX account with quick one-time Aadhaar/PAN KYC.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <strong className="text-slate-900 font-bold flex items-center gap-1.5">
                    <span className="flex h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] items-center justify-center">2</span>
                    Copy USDT (BSC / BEP-20) Address
                  </strong>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    In CoinDCX: Go to <strong>Deposit Crypto ➔ USDT ➔ Select BSC (BEP-20)</strong>. Copy your 0x address and paste it on the left.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <strong className="text-slate-900 font-bold flex items-center gap-1.5">
                    <span className="flex h-4 w-4 rounded-full bg-emerald-600 text-white text-[10px] items-center justify-center">3</span>
                    Instant INR Bank Transfer
                  </strong>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Once received, tap <strong>Sell USDT for INR</strong> in CoinDCX, then tap <strong>Withdraw INR to Bank</strong>. ₹100+ lands in your bank account via IMPS/UPI!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout History Ledger */}
      <div className="glare-card rounded-2xl p-6 space-y-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>Payout History</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {history.length} withdrawal{history.length !== 1 ? "s" : ""}
          </span>
        </div>

        {historyLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono animate-pulse">
            Loading payout history...
          </div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">
            No withdrawal history yet. Reach ₹100 to make your first withdrawal!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-mono">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Amount (INR)</th>
                  <th className="pb-3 font-semibold">USDT Dispatched</th>
                  <th className="pb-3 font-semibold">Polygon Address</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Blockchain Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-slate-700 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString()}{" "}
                      <span className="text-slate-400">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-slate-900 font-mono">
                      ₹{item.amountInr.toFixed(0)}{" "}
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        (+₹{(item.bufferedInr - item.amountInr).toFixed(1)} buffer)
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-blue-700">
                      {item.usdtAmount.toFixed(4)} USDT
                    </td>
                    <td className="py-3 font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                      {item.walletAddress.slice(0, 6)}...{item.walletAddress.slice(-4)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                          item.status === "FINISHED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : item.status === "PROCESSING"
                            ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
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
                          className="inline-flex items-center gap-1 font-mono text-blue-600 hover:underline text-[11px] font-bold"
                        >
                          <span>{item.txHash.slice(0, 8)}...</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">
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
