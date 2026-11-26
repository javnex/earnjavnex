"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Wallet,
  ExternalLink,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <ArrowRightLeft className="h-6 w-6 text-blue-600" />
            <span>Transfers & Payout Audit Logs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Audited ledger for peer-to-peer account pooling and automated NOWPayments Polygon crypto payouts.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab("TRANSFERS")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === "TRANSFERS"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            P2P Transfers ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab("WITHDRAWALS")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === "WITHDRAWALS"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            Crypto Payouts ({withdrawals.length})
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-mono animate-pulse">
            Loading audit records...
          </div>
        ) : activeTab === "TRANSFERS" ? (
          /* Transfers Table */
          transfers.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 font-mono space-y-2">
              <ArrowRightLeft className="h-8 w-8 text-slate-400 mx-auto" />
              <p>No internal transfers recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono tracking-wider">
                    <th className="pb-3.5 font-semibold">Date</th>
                    <th className="pb-3.5 font-semibold">Sender (Pool Account)</th>
                    <th className="pb-3.5 font-semibold">Receiver (Main ID)</th>
                    <th className="pb-3.5 font-semibold">Amount</th>
                    <th className="pb-3.5 font-semibold">Fee</th>
                    <th className="pb-3.5 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 text-slate-500 font-mono text-[11px]">
                        {new Date(tx.createdAt).toLocaleDateString()}{" "}
                        <span className="text-slate-400">
                          {new Date(tx.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      <td className="py-4">
                        <div className="font-bold text-slate-900">
                          {tx.sender?.name || tx.sender?.email}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          ID: <span className="text-blue-600 font-bold">{tx.sender?.userCode}</span>
                        </div>
                      </td>

                      <td className="py-4">
                        <div className="font-bold text-slate-900">
                          {tx.receiver?.name || tx.receiver?.email}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          ID: <span className="text-blue-600 font-bold">{tx.receiver?.userCode}</span>
                        </div>
                      </td>

                      <td className="py-4 font-mono font-black text-emerald-600 text-sm">
                        ₹{tx.amountInr.toFixed(0)} <span className="text-[10px] text-slate-400 font-normal">INR</span>
                      </td>

                      <td className="py-4 text-emerald-700 font-mono font-bold text-[11px]">
                        ₹0 (Free)
                      </td>

                      <td className="py-4 text-slate-500 font-mono text-[11px] italic">
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
            <div className="py-16 text-center text-xs text-slate-500 font-mono space-y-2">
              <Wallet className="h-8 w-8 text-slate-400 mx-auto" />
              <p>No crypto withdrawals recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono tracking-wider">
                    <th className="pb-3.5 font-semibold">Date</th>
                    <th className="pb-3.5 font-semibold">User</th>
                    <th className="pb-3.5 font-semibold">INR (Base + 6% Buffer)</th>
                    <th className="pb-3.5 font-semibold">USDT Sent</th>
                    <th className="pb-3.5 font-semibold">Polygon Address</th>
                    <th className="pb-3.5 font-semibold">Status</th>
                    <th className="pb-3.5 font-semibold text-right">Blockchain Tx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 text-slate-500 font-mono text-[11px]">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-4">
                        <div className="font-bold text-slate-900">
                          {w.user?.name || w.user?.email}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          ID: <span className="text-blue-600 font-bold">{w.user?.userCode}</span>
                        </div>
                      </td>

                      <td className="py-4 font-mono">
                        <span className="font-black text-slate-900">₹{w.amountInr}</span>{" "}
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          (₹{w.bufferedInr.toFixed(1)})
                        </span>
                      </td>

                      <td className="py-4 font-mono font-black text-blue-600">
                        {w.usdtAmount.toFixed(4)} USDT
                      </td>

                      <td className="py-4 font-mono text-[11px] text-slate-500">
                        {w.walletAddress.slice(0, 8)}...{w.walletAddress.slice(-4)}
                      </td>

                      <td className="py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                            w.status === "FINISHED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : w.status === "PROCESSING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>

                      <td className="py-4 text-right">
                        {w.txHash ? (
                          <a
                            href={`https://polygonscan.com/tx/${w.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-blue-600 hover:underline text-[11px] font-semibold"
                          >
                            <span>{w.txHash.slice(0, 8)}...</span>
                            <ExternalLink className="h-3 w-3 text-blue-500" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-mono">
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
