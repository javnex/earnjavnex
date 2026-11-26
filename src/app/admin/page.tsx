"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ListTodo,
  CheckSquare,
  Wallet,
  Coins,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  PlusCircle,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <LayoutDashboard className="h-6 w-6 text-blue-600" />
            <span>Admin Overview & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Real-time platform metrics, task quotas, and NOWPayments custody balance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl btn-futuristic-glass text-xs font-mono font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/tasks"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl btn-futuristic text-xs font-mono font-bold transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add New Shop Task</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NOWPayments Custody Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono font-semibold">
            <span>NOWPayments Custody</span>
            <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
            {stats ? stats.nowpaymentsCustodyUsdt.toFixed(2) : "..."}{" "}
            <span className="text-xs text-slate-500 font-normal">USDT</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Polygon USDT balance for instant payouts.
          </p>
        </div>

        {/* Total Tasks Active / Closed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono font-semibold">
            <span>Shop Tasks Live</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600">
              <ListTodo className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
            {stats ? stats.activeTasks : "..."}
            <span className="text-xs text-slate-400 ml-2 font-normal">
              / {stats ? stats.totalTasks : "..."} total
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            {stats ? stats.closedTasks : 0} tasks reached limit and auto-closed.
          </p>
        </div>

        {/* Verified Reviews */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono font-semibold">
            <span>Verified Reviews</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 font-mono tracking-tight">
            {stats ? stats.verifiedSubmissions : "..."}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            {stats && stats.pendingSubmissions > 0 ? (
              <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {stats.pendingSubmissions} awaiting review
              </span>
            ) : (
              "All submitted reviews verified"
            )}
          </p>
        </div>

        {/* User Wallets Total Liability */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono font-semibold">
            <span>User Wallet Balance</span>
            <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
            ₹{stats ? stats.totalUserWalletBalanceInr.toFixed(0) : "..."}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Across {stats ? stats.totalUsers : "..."} registered users.
          </p>
        </div>
      </div>

      {/* Secondary Metric Bar: Payout Stats */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono uppercase tracking-wider">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <span>Cumulative USDT Payout Dispatches</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Total USDT Paid Out
            </span>
            <div className="text-2xl font-black font-mono text-slate-900">
              {stats ? stats.totalWithdrawnUsdt.toFixed(4) : "0.0000"} <span className="text-xs text-slate-500 font-normal">USDT</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Dispatched via Polygon POS network
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Total INR Settled
            </span>
            <div className="text-2xl font-black font-mono text-emerald-600">
              ₹{stats ? stats.totalWithdrawnInr.toFixed(0) : "0"} <span className="text-xs text-slate-500 font-normal">INR</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Includes 6% bank cash-out buffer
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Completed Payouts
            </span>
            <div className="text-2xl font-black font-mono text-blue-600">
              {stats ? stats.completedWithdrawalsCount : 0} <span className="text-xs text-slate-500 font-normal">Transfers</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Zero bank blocks/freezes</p>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/tasks"
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 group hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-blue-600 font-mono font-bold">
            <span>Manage Tasks</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Add or Auto-Close Shops</h3>
          <p className="text-xs text-slate-600 font-mono leading-relaxed">
            Set custom review limits, update instructions, or close tasks when budget is reached.
          </p>
        </Link>

        <Link
          href="/admin/submissions"
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 group hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-blue-600 font-mono font-bold">
            <span>Verification Queue</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Toggle Auto / Manual Mode</h3>
          <p className="text-xs text-slate-600 font-mono leading-relaxed">
            Switch between instant automatic approval and manual link verification.
          </p>
        </Link>

        <Link
          href="/admin/payouts"
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 group hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-blue-600 font-mono font-bold">
            <span>Audit Logs</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Track Transfers & Multi-Accounts</h3>
          <p className="text-xs text-slate-600 font-mono leading-relaxed">
            Monitor peer-to-peer ₹0 transfers and NOWPayments automated blockchain hashes.
          </p>
        </Link>
      </div>
    </div>
  );
}
