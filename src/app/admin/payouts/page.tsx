"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Wallet,
  Clock,
  ExternalLink,
  Users,
  Search,
  Sparkles,
} from "lucide-react";

export default function AdminPayoutsPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TRANSFERS" | "WITHDRAWALS">("TRANSFERS");

  useEffect(() => {
    const loadAudit = async () => {
      try {
        setLoading(true);
        const [transRes, withRes] = await Promise.all([
          fetch("/api/transfers?all=true"),
          fetch("/api/withdrawals?all=true"),
        ]);

        if (transRes.ok) {
          const data = await transRes.json();
          setTransfers(data.transfers || []);
        }

        if (withRes.ok) {
          const data = await withRes.json();
          setWithdrawals(data.withdrawals || []);
        }
      } catch (err) {
        console.error("Failed to load audit logs:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAudit();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ArrowRightLeft className="h-6 w-6 text-violet-400" />
            <span>Transfers & Payout Audit Logs</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete transparency into peer-to-peer account pooling and automated NOWPayments Polygon crypto payouts.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("TRANSFERS")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "TRANSFERS"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            P2P Transfers ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab("WITHDRAWALS")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "WITHDRAWALS"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Crypto Payouts ({withdrawals.length})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
            Loading audit records...
          </div>
        ) : activeTab === "TRANSFERS" ? (
          /* Transfers Table */
          transfers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No internal transfers recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Sender (Pool Account)</th>
                    <th className="pb-3 font-semibold">Receiver (Main ID)</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Fee</th>
                    <th className="pb-3 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transfers.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-850/50">
                      <td className="py-3 text-slate-400 font-mono text-[11px]">
                        {new Date(tx.createdAt).toLocaleDateString()}{" "}
                        <span className="text-slate-500">
                          {new Date(tx.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      <td className="py-3">
                        <div className="font-semibold text-white">
                          {tx.sender?.name || tx.sender?.email}
                        </div>
                        <div className="text-[10px] font-mono text-cyan-400">
                          {tx.sender?.userCode}
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="font-semibold text-emerald-300">
                          {tx.receiver?.name || tx.receiver?.email}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-400">
                          {tx.receiver?.userCode}
                        </div>
                      </td>

                      <td className="py-3 font-mono font-bold text-white">
                        ₹{tx.amountInr.toFixed(0)} INR
                      </td>

                      <td className="py-3 text-emerald-400 font-bold text-[11px]">
                        ₹0 (Free)
                      </td>

                      <td className="py-3 text-slate-400 text-[11px] italic">
                        {tx.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Withdrawals Table */
          withdrawals.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No crypto withdrawals recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">INR (Base + 6% Buffer)</th>
                    <th className="pb-3 font-semibold">USDT Sent</th>
                    <th className="pb-3 font-semibold">Polygon Address</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Blockchain Tx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-850/50">
                      <td className="py-3 text-slate-400 font-mono text-[11px]">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3">
                        <div className="font-semibold text-white">
                          {w.user?.name || w.user?.email}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {w.user?.userCode}
                        </div>
                      </td>

                      <td className="py-3 font-mono">
                        <span className="font-bold text-white">₹{w.amountInr}</span>{" "}
                        <span className="text-[10px] text-emerald-400">
                          (₹{w.bufferedInr.toFixed(1)})
                        </span>
                      </td>

                      <td className="py-3 font-mono font-bold text-emerald-400">
                        {w.usdtAmount.toFixed(4)} USDT
                      </td>

                      <td className="py-3 font-mono text-[11px] text-slate-400">
                        {w.walletAddress.slice(0, 8)}...{w.walletAddress.slice(-4)}
                      </td>

                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            w.status === "FINISHED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : w.status === "PROCESSING"
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>

                      <td className="py-3 text-right">
                        {w.txHash ? (
                          <a
                            href={`https://polygonscan.com/tx/${w.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:text-emerald-300 text-[11px] underline"
                          >
                            <span>{w.txHash.slice(0, 8)}...</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-500 text-[11px]">
                            {w.errorMessage || "Processing"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
