"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import {
  Wallet,
  ArrowRightLeft,
  ListTodo,
  Check,
  Copy,
  Zap,
  Info,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function WalletCard() {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);

  const user = session?.user as any;
  const walletBalance = Number(user?.walletBalance ?? 0);
  const userCode = user?.userCode ?? "USR-00000";
  const minThreshold = 100;
  const progressPercent = Math.min(
    100,
    Math.round((walletBalance / minThreshold) * 100)
  );
  const remainingInr = Math.max(0, minThreshold - walletBalance);
  const tasksNeeded = Math.ceil(remainingInr / 10);
  const isUnlocked = walletBalance >= minThreshold;

  const copyCode = () => {
    navigator.clipboard.writeText(userCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white shadow-xl shadow-blue-950/20 border border-blue-700/40 relative overflow-hidden">
      {/* Ambient Blue & Green Lighting Spheres */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Balance & User Code */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-300" />
              <span>Web Wallet Terminal</span>
            </span>
            <button
              onClick={copyCode}
              title="Click to copy your User ID"
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-950/50 hover:bg-blue-900/60 px-3 py-0.5 text-xs font-mono text-blue-100 transition-all cursor-pointer shadow-inner"
            >
              <span className="text-blue-300">My ID:</span>
              <span className="font-bold text-white">{userCode}</span>
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3 text-blue-300" />
              )}
            </button>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-5xl sm:text-6xl font-black tracking-tight text-white tabular-nums drop-shadow-md">
              ₹<span className="text-emerald-400">{walletBalance.toFixed(0)}</span>
            </span>
            <span className="text-sm font-bold text-blue-200">INR</span>
          </div>

          {/* ₹100 Progress Bar */}
          <div className="w-full max-w-md space-y-2 pt-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-blue-100">
                {isUnlocked ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                    <Zap className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
                    <span>Instant Withdraw Unlocked</span>
                  </span>
                ) : (
                  <span>
                    Progress to ₹{minThreshold} payout:{" "}
                    <strong className="text-white font-bold tabular-nums">
                      ₹{walletBalance.toFixed(0)} / ₹{minThreshold}
                    </strong>
                  </span>
                )}
              </span>
              <span className="text-emerald-300 font-bold tabular-nums">{progressPercent}%</span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-blue-950/70 border border-blue-700/50">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isUnlocked
                    ? "bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                    : "bg-gradient-to-r from-blue-400 to-emerald-400"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-[11px] text-blue-200/90 leading-relaxed font-sans">
              {isUnlocked
                ? "Withdraw your balance instantly to your Indian bank account via CoinDCX."
                : `Complete ${tasksNeeded} more task${
                    tasksNeeded > 1 ? "s" : ""
                  } (or pool rewards from secondary accounts) to unlock instant withdraw.`}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 sm:w-auto w-full">
          <Link
            href="/dashboard/tasks"
            className="flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-blue-50 text-blue-900 font-bold px-5 py-3 text-xs text-center shadow-md transition-all cursor-pointer"
          >
            <ListTodo className="h-4 w-4 text-blue-700" />
            <span>Complete Tasks</span>
          </Link>

          <Link
            href="/dashboard/transfer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 px-5 py-3 text-xs text-center transition-all cursor-pointer"
          >
            <ArrowRightLeft className="h-4 w-4 text-blue-200" />
            <span>₹0 Peer Transfer</span>
          </Link>

          <Link
            href="/dashboard/withdraw"
            className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-semibold transition-all text-center cursor-pointer ${
              isUnlocked
                ? "bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/40"
                : "bg-blue-950/60 border border-blue-700/50 text-blue-300/80 hover:text-white"
            }`}
          >
            <Wallet className={`h-4 w-4 ${isUnlocked ? "text-white" : "text-blue-300"}`} />
            <span>{isUnlocked ? "Withdraw Instantly" : "Withdraw (Locked at ₹100)"}</span>
          </Link>
        </div>
      </div>

      {/* Info Tip about multi-account pooling */}
      <div className="mt-6 pt-4 border-t border-blue-700/40 flex items-start sm:items-center gap-2 text-xs text-blue-200">
        <Info className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5 sm:mt-0" />
        <span>
          <strong className="text-white">Pro Tip:</strong> Own multiple accounts? Complete tasks on each and transfer your earnings to this ID for ₹0 fee.
        </span>
      </div>
    </div>
  );
}
