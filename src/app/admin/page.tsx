"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ListTodo,
  CheckSquare,
  Wallet,
  Users,
  Coins,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  ExternalLink,
} from "lucide-react";

interface AdminStats {
  activeTasks: number;
  closedTasks: number;
  totalTasks: number;
  verifiedSubmissions: number;
  pendingSubmissions: number;
  totalUsers: number;
  totalUserWalletBalanceInr: number;
  totalWithdrawnUsdt: number;
  totalWithdrawnInr: number;
  completedWithdrawalsCount: number;
  nowpaymentsCustodyUsdt: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <LayoutDashboard className="h-6 w-6 text-violet-400" />
            <span>Admin Overview & Analytics</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time platform metrics, task quotas, and NOWPayments custody balance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/tasks"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-xs font-bold text-white shadow-md shadow-violet-500/20 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add New Shop Task</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NOWPayments Custody Balance */}
        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-slate-900 to-violet-950/30 p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-violet-300 font-semibold">
            <span>NOWPayments Custody</span>
            <Coins className="h-4 w-4 text-violet-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {stats ? stats.nowpaymentsCustodyUsdt.toFixed(2) : "..."} <span className="text-sm text-violet-400">USDT</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Polygon USDT balance available for instant user payouts.
          </p>
        </div>

        {/* Total Tasks Active / Closed */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Shop Tasks Live</span>
            <ListTodo className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {stats ? stats.activeTasks : "..."}
            <span className="text-sm text-slate-500 ml-2 font-normal">
              / {stats ? stats.totalTasks : "..."} total
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {stats ? stats.closedTasks : 0} tasks reached limit and auto-closed.
          </p>
        </div>

        {/* Verified Reviews */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Verified Reviews</span>
            <CheckSquare className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {stats ? stats.verifiedSubmissions : "..."}
          </div>
          <p className="text-[11px] text-slate-400">
            {stats && stats.pendingSubmissions > 0 ? (
              <span className="text-amber-400 font-semibold">
                {stats.pendingSubmissions} reviews awaiting manual approval
              </span>
            ) : (
              "All submitted reviews verified"
            )}
          </p>
        </div>

        {/* User Wallets Total Liability */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>User Wallet Balance</span>
            <Wallet className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ₹{stats ? stats.totalUserWalletBalanceInr.toFixed(0) : "..."}
          </div>
          <p className="text-[11px] text-slate-400">
            Across {stats ? stats.totalUsers : "..."} registered users.
          </p>
        </div>
      </div>

      {/* Secondary Metric Bar: Payout Stats */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <span>Cumulative USDT Payout Dispatches</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div className="space-y-1">
            <span className="text-xs text-slate-400">Total USDT Paid Out</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {stats ? stats.totalWithdrawnUsdt.toFixed(4) : "0.0000"} USDT
            </div>
            <p className="text-[11px] text-slate-500">
              Dispatched via Polygon network
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">Total INR Settled</span>
            <div className="text-2xl font-bold text-white">
              ₹{stats ? stats.totalWithdrawnInr.toFixed(0) : "0"} INR
            </div>
            <p className="text-[11px] text-slate-500">
              Includes 6% bank cash-out buffer
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">Completed Payouts</span>
            <div className="text-2xl font-bold text-cyan-400">
              {stats ? stats.completedWithdrawalsCount : 0} Transfers
            </div>
            <p className="text-[11px] text-slate-500">Zero bank blocks/freezes</p>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/tasks"
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-violet-500/40 hover:bg-slate-900 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between text-xs text-violet-400 font-bold">
            <span>Manage Tasks</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-sm font-bold text-white">Add or Auto-Close Shops</h3>
          <p className="text-xs text-slate-400">
            Set custom review limits, update instructions, or close tasks when budget is reached.
          </p>
        </Link>

        <Link
          href="/admin/submissions"
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-emerald-500/40 hover:bg-slate-900 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
            <span>Verification Queue</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-sm font-bold text-white">Toggle Auto / Manual Mode</h3>
          <p className="text-xs text-slate-400">
            Switch between instant automatic approval and manual link verification.
          </p>
        </Link>

        <Link
          href="/admin/payouts"
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-cyan-500/40 hover:bg-slate-900 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between text-xs text-cyan-400 font-bold">
            <span>Audit Logs</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-sm font-bold text-white">Track Transfers & Multi-Accounts</h3>
          <p className="text-xs text-slate-400">
            Monitor peer-to-peer ₹0 transfers and NOWPayments automated blockchain hashes.
          </p>
        </Link>
      </div>
    </div>
  );
}
