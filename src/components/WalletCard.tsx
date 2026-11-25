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
  ShieldAlert,
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
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/30 p-5 sm:p-6 shadow-xl shadow-black/40">
      {/* Decorative Glow */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Balance & User Code */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Web Wallet Balance
            </span>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs font-mono text-emerald-300 hover:bg-slate-700 transition-colors"
            >
              <span>{userCode}</span>
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3 text-slate-400" />
              )}
            </button>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              ₹{walletBalance.toFixed(0)}
            </span>
            <span className="text-sm font-medium text-emerald-400">INR</span>
            <span className="text-xs text-slate-400">
              (~{(walletBalance * 1.06 / 90.5).toFixed(2)} USDT with 6% buffer)
            </span>
          </div>

          {/* ₹100 Progress Bar */}
          <div className="w-full max-w-md space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">
                {isUnlocked ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <Zap className="h-3.5 w-3.5 fill-emerald-400" /> Instant
                    USDT Cashout Unlocked!
                  </span>
                ) : (
                  <span>
                    Progress to ₹{minThreshold} payout:{" "}
                    <strong className="text-white">
                      ₹{walletBalance.toFixed(0)} / ₹{minThreshold}
                    </strong>
                  </span>
                )}
              </span>
              <span className="text-emerald-400">{progressPercent}%</span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isUnlocked
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-400/50"
                    : "bg-gradient-to-r from-emerald-600 to-cyan-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400">
              {isUnlocked
                ? "You can withdraw your balance instantly to your Polygon USDT wallet address."
                : `Complete ${tasksNeeded} more task${
                    tasksNeeded > 1 ? "s" : ""
                  } (or pool ₹10 from secondary accounts) to unlock withdrawal.`}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 sm:w-auto w-full">
          <Link
            href="/dashboard/tasks"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 transition-all text-center"
          >
            <ListTodo className="h-4 w-4" />
            <span>Complete Tasks (+₹10)</span>
          </Link>

          <Link
            href="/dashboard/transfer"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-all text-center"
          >
            <ArrowRightLeft className="h-4 w-4 text-cyan-400" />
            <span>₹0 Peer Transfer</span>
          </Link>

          <Link
            href="/dashboard/withdraw"
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all text-center ${
              isUnlocked
                ? "border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 shadow-md shadow-emerald-950"
                : "border border-slate-800 bg-slate-900/50 text-slate-500 hover:text-slate-400"
            }`}
          >
            <Wallet className={`h-4 w-4 ${isUnlocked ? "text-emerald-400" : ""}`} />
            <span>{isUnlocked ? "Withdraw Instantly" : "Withdraw (Locked at ₹100)"}</span>
          </Link>
        </div>
      </div>

      {/* Info Tip about multi-account pooling */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-400">
        <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-200">Multi-Account Pooling:</strong> Since each Google ID can review a shop once, you can earn ₹10 on your other Google accounts and transfer them to this User ID (<code className="text-emerald-300 font-mono">{userCode}</code>) with ₹0 fees to reach ₹100 fast!
        </span>
      </div>
    </div>
  );
}
