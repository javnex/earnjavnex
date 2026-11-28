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
  TrendingUp,
} from "lucide-react";

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "TASKS" | "TRANSFERS" | "WITHDRAWALS">("ALL");

  useEffect(() => {
    if (status === "unauthenticated") {
      setSubmissions([]);
      setTransfers([]);
      setWithdrawals([]);
      setLoading(false);
      return;
    }
    if (status !== "authenticated") return;

    const loadAll = async () => {
      try {
        setLoading(true);
        const [subsRes, transRes, withsRes] = await Promise.all([
          fetch("/api/submissions", { cache: "no-store" }),
          fetch("/api/transfers", { cache: "no-store" }),
          fetch("/api/withdrawals", { cache: "no-store" }),
        ]);

        if (subsRes.ok) {
          const data = await subsRes.json();
          setSubmissions(data.submissions || []);
        } else {
          setSubmissions([]);
        }

        if (transRes.ok) {
          const data = await transRes.json();
          setTransfers(data.transfers || []);
        } else {
          setTransfers([]);
        }

        if (withsRes.ok) {
          const data = await withsRes.json();
          setWithdrawals(data.withdrawals || []);
        } else {
          setWithdrawals([]);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [status]);

  if (status === "unauthenticated" || (status !== "loading" && !session?.user)) {
    return null;
  }

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
      title: `Polygon USDT Payout (${w.usdtAmount} USDT)`,
      subtitle: `Address: ${w.walletAddress.slice(0, 8)}...${w.walletAddress.slice(-6)}`,
      amount: w.amountInr,
      isCredit: false,
      date: new Date(w.createdAt),
      status: w.status,
      extra: w.txHash,
    });
  });

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  const filteredEvents = events.filter((e) => {
    if (filter === "ALL") return true;
    if (filter === "TASKS") return e.type === "TASK";
    if (filter === "TRANSFERS")
      return e.type === "TRANSFER_SENT" || e.type === "TRANSFER_RECEIVED";
    if (filter === "WITHDRAWALS") return e.type === "WITHDRAWAL";
    return true;
  });

  const totalEarned = submissions
    .filter((s) => s.status === "APPROVED")
    .reduce((acc, s) => acc + (s.rewardCredited || 10), 0);
  const totalWithdrawn = withdrawals
    .filter((w) => w.status === "FINISHED")
    .reduce((acc, w) => acc + (w.amountInr || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <History className="h-6 w-6 text-blue-600" />
            <span>Wallet Transaction Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Audited blockchain and micro-task ledger for task rewards, internal transfers, and Polygon payouts.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {(["ALL", "TASKS", "TRANSFERS", "WITHDRAWALS"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                filter === tab
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "text-slate-600 hover:text-blue-600 hover:bg-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Top Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glare-card rounded-2xl p-5 space-y-1 bg-white border border-slate-200">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Total Task Earnings
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600">
            ₹{totalEarned}
          </div>
          <p className="text-[10px] text-slate-400 font-mono">{submissions.length} verified review tasks</p>
        </div>

        <div className="glare-card rounded-2xl p-5 space-y-1 bg-white border border-slate-200">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Internal P2P Transfers
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-blue-600">
            {transfers.length}
          </div>
          <p className="text-[10px] text-slate-400 font-mono">₹0 fee multi-account pool events</p>
        </div>

        <div className="glare-card rounded-2xl p-5 space-y-1 bg-white border border-slate-200">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Total Withdrawn
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-600">
            ₹{totalWithdrawn}
          </div>
          <p className="text-[10px] text-slate-400 font-mono">{withdrawals.length} completed withdrawals</p>
        </div>
      </div>

      {/* Ledger List Container */}
      <div className="glare-card rounded-2xl p-5 sm:p-6 space-y-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span>Ledger Entries ({filteredEvents.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Audited & Verified Record
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-mono animate-pulse">
            Loading ledger events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 font-mono space-y-2">
            <Clock className="h-8 w-8 text-slate-300 mx-auto" />
            <p>No activity found under this filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((e) => (
              <div
                key={e.id}
                className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-blue-300 bg-white"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-xs shrink-0">
                    {e.type === "TASK" && <ListTodo className="h-4 w-4 text-emerald-600" />}
                    {e.type === "TRANSFER_RECEIVED" && (
                      <ArrowDownLeft className="h-4 w-4 text-blue-600" />
                    )}
                    {e.type === "TRANSFER_SENT" && (
                      <ArrowUpRight className="h-4 w-4 text-amber-600" />
                    )}
                    {e.type === "WITHDRAWAL" && <Wallet className="h-4 w-4 text-indigo-600" />}
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900">
                      {e.title}
                    </h3>
                    <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md font-mono">
                      {e.subtitle}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {e.date.toLocaleDateString()}{" "}
                      {e.date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className={`text-base font-mono font-black ${e.isCredit ? "text-emerald-600" : "text-slate-900"}`}>
                    {e.isCredit ? "+" : "-"}₹{e.amount.toFixed(0)}
                  </div>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-mono font-bold ${
                      e.status === "APPROVED" ||
                      e.status === "COMPLETED" ||
                      e.status === "FINISHED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs"
                        : e.status === "PROCESSING" || e.status === "PENDING"
                        ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
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
