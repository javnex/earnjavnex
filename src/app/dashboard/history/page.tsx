"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  History,
  ListTodo,
  ArrowRightLeft,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  ExternalLink,
  Clock,
  Sparkles,
} from "lucide-react";

export default function HistoryPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "TASKS" | "TRANSFERS" | "WITHDRAWALS">("ALL");

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [subsRes, transRes, withsRes] = await Promise.all([
          fetch("/api/submissions"),
          fetch("/api/transfers"),
          fetch("/api/withdrawals"),
        ]);

        if (subsRes.ok) {
          const data = await subsRes.json();
          setSubmissions(data.submissions || []);
        }

        if (transRes.ok) {
          const data = await transRes.json();
          setTransfers(data.transfers || []);
        }

        if (withsRes.ok) {
          const data = await withsRes.json();
          setWithdrawals(data.withdrawals || []);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  // Combine and sort events by date descending
  type EventItem = {
    id: string;
    type: "TASK" | "TRANSFER_SENT" | "TRANSFER_RECEIVED" | "WITHDRAWAL";
    title: string;
    subtitle: string;
    amount: number;
    isCredit: boolean;
    date: Date;
    status: string;
    extra?: any;
  };

  const events: EventItem[] = [];

  submissions.forEach((s) => {
    events.push({
      id: "sub-" + s.id,
      type: "TASK",
      title: "Review Task: " + s.task.title,
      subtitle: s.proofLink,
      amount: s.rewardCredited,
      isCredit: s.status === "APPROVED",
      date: new Date(s.createdAt),
      status: s.status,
    });
  });

  transfers.forEach((t) => {
    const isSent = t.senderId === currentUserId;
    const counterparty = isSent ? t.receiver : t.sender;
    events.push({
      id: "trans-" + t.id,
      type: isSent ? "TRANSFER_SENT" : "TRANSFER_RECEIVED",
      title: isSent
        ? `Sent to ${counterparty.name || counterparty.email}`
        : `Received from ${counterparty.name || counterparty.email}`,
      subtitle: `ID: ${counterparty.userCode}${t.note ? ` • "${t.note}"` : ""}`,
      amount: t.amountInr,
      isCredit: !isSent,
      date: new Date(t.createdAt),
      status: "COMPLETED",
    });
  });

  withdrawals.forEach((w) => {
    events.push({
      id: "with-" + w.id,
      type: "WITHDRAWAL",
      title: `USDT Polygon Payout (${w.usdtAmount} USDT)`,
      subtitle: `To: ${w.walletAddress.slice(0, 10)}...${w.walletAddress.slice(-6)}`,
      amount: w.amountInr,
      isCredit: false,
      date: new Date(w.createdAt),
      status: w.status,
      extra: w.txHash,
    });
  });

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  const filteredEvents = events.filter((e) => {
    if (filter === "TASKS") return e.type === "TASK";
    if (filter === "TRANSFERS")
      return e.type === "TRANSFER_SENT" || e.type === "TRANSFER_RECEIVED";
    if (filter === "WITHDRAWALS") return e.type === "WITHDRAWAL";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <History className="h-6 w-6 text-emerald-400" />
            <span>Wallet Transaction Ledger</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete audit trail of your review task earnings, ₹0 internal transfers, and Polygon USDT payouts.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(["ALL", "TASKS", "TRANSFERS", "WITHDRAWALS"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === tab
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
            Loading ledger events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <Clock className="h-8 w-8 text-slate-600 mx-auto" />
            <p>No activity found under this filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredEvents.map((e) => (
              <div
                key={e.id}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-850/40 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      e.type === "TASK"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : e.type === "TRANSFER_RECEIVED"
                        ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                        : e.type === "TRANSFER_SENT"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                    }`}
                  >
                    {e.type === "TASK" && <ListTodo className="h-4 w-4" />}
                    {e.type === "TRANSFER_RECEIVED" && (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                    {e.type === "TRANSFER_SENT" && (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                    {e.type === "WITHDRAWAL" && <Wallet className="h-4 w-4" />}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {e.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                      {e.subtitle}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {e.date.toLocaleDateString()}{" "}
                      {e.date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="text-right space-y-1 shrink-0">
                  <div
                    className={`text-sm font-mono font-extrabold ${
                      e.isCredit ? "text-emerald-400" : "text-slate-300"
                    }`}
                  >
                    {e.isCredit ? "+" : "-"}₹{e.amount.toFixed(0)}
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      e.status === "APPROVED" ||
                      e.status === "COMPLETED" ||
                      e.status === "FINISHED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : e.status === "PROCESSING" || e.status === "PENDING"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
