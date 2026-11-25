"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Search,
  UserCheck,
  UserX,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
} from "lucide-react";

interface Transfer {
  id: string;
  amountInr: number;
  note?: string;
  createdAt: string;
  senderId: string;
  receiverId: string;
  sender: { name?: string; email: string; userCode: string };
  receiver: { name?: string; email: string; userCode: string };
}

export default function TransferPage() {
  const { data: session, update } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const walletBalance = Number((session?.user as any)?.walletBalance ?? 0);
  const myUserCode = (session?.user as any)?.userCode ?? "";

  const [recipientInput, setRecipientInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [recipientPreview, setRecipientPreview] = useState<{
    userCode: string;
    name: string;
    email: string;
  } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [transferring, setTransferring] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [history, setHistory] = useState<Transfer[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Debounced recipient lookup
  useEffect(() => {
    const trimmed = recipientInput.trim();
    if (trimmed.length < 3) {
      setRecipientPreview(null);
      setLookupError(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLookupLoading(true);
        setLookupError(null);
        const res = await fetch(
          `/api/transfers/lookup?query=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();

        if (data.isSelf) {
          setLookupError("You cannot transfer to your own account.");
          setRecipientPreview(null);
        } else if (data.user) {
          setRecipientPreview(data.user);
          setLookupError(null);
        } else {
          setRecipientPreview(null);
          setLookupError("No registered user found with this User ID or email.");
        }
      } catch {
        setLookupError("Failed to lookup recipient.");
      } finally {
        setLookupLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [recipientInput]);

  // Fetch transfer history
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/transfers");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.transfers || []);
      }
    } catch (err) {
      console.error("Failed to load transfers:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountInput);

    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: "error", text: "Enter a valid amount (minimum ₹1)." });
      return;
    }

    if (amount > walletBalance) {
      setMessage({
        type: "error",
        text: `Insufficient balance! You have ₹${walletBalance.toFixed(
          2
        )}, cannot send ₹${amount.toFixed(2)}.`,
      });
      return;
    }

    if (!recipientPreview) {
      setMessage({
        type: "error",
        text: "Please enter a valid recipient User ID (e.g., USR-XXXXX) or registered email.",
      });
      return;
    }

    try {
      setTransferring(true);
      setMessage(null);

      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIdentifier: recipientPreview.userCode,
          amount,
          note: noteInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      setMessage({
        type: "success",
        text: data.message || `Successfully sent ₹${amount}!`,
      });

      // Clear fields
      setRecipientInput("");
      setAmountInput("");
      setNoteInput("");
      setRecipientPreview(null);

      // Update session wallet balance
      if (data.newBalance !== undefined) {
        update({ walletBalance: data.newBalance });
      }

      // Refresh history
      fetchHistory();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Transfer error" });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <ArrowRightLeft className="h-6 w-6 text-cyan-400" />
          <span>Internal Wallet Transfer (₹0 Fee)</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Instantly transfer funds to another user or pool rewards from your secondary Google accounts into one primary ID to reach the ₹100 withdrawal threshold.
        </p>
      </div>

      {/* Notice & Guide */}
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-xs text-cyan-300 flex items-start gap-3">
        <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-semibold mb-0.5">
            How Multi-Account Pooling Works:
          </strong>
          If you have multiple Google accounts, copy your primary account's User ID (
          <code className="bg-cyan-900/40 px-1 py-0.5 rounded font-mono font-bold text-cyan-200">
            {myUserCode || "USR-XXXXX"}
          </code>
          ). Log into your other accounts, visit this page, enter that User ID, and send all ₹10 balances to your main ID with zero fees!
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-xl p-4 text-sm font-medium border ${
            message.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/60 border-rose-500/40 text-rose-300"
          }`}
        >
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Transfer Form */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Send Balance</h2>
              <div className="text-xs text-slate-400">
                Available:{" "}
                <strong className="text-emerald-400 font-mono text-sm">
                  ₹{walletBalance.toFixed(2)}
                </strong>
              </div>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              {/* Recipient Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Recipient User ID or Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. USR-10001 or friend@gmail.com"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <div className="absolute right-3 top-3">
                    {lookupLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : recipientPreview ? (
                      <UserCheck className="h-4 w-4 text-emerald-400" />
                    ) : lookupError ? (
                      <UserX className="h-4 w-4 text-rose-400" />
                    ) : (
                      <Search className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Recipient Preview Box */}
                {recipientPreview && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">
                        {recipientPreview.name}
                      </span>
                      <span className="text-slate-400 ml-2">
                        ({recipientPreview.email})
                      </span>
                    </div>
                    <span className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
                      {recipientPreview.userCode}
                    </span>
                  </div>
                )}

                {lookupError && (
                  <p className="text-xs text-rose-400 mt-1">{lookupError}</p>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">
                    Amount (₹ INR)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAmountInput(String(walletBalance))}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Max (₹{walletBalance.toFixed(0)})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={walletBalance}
                    placeholder="10"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Note / Remarks (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="e.g. Account 2 pooling for payout"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Fee notice & Transfer button */}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-slate-400 pb-3">
                  <span>Transfer Fee:</span>
                  <span className="text-emerald-400 font-bold">₹0.00 (Free)</span>
                </div>

                <button
                  type="submit"
                  disabled={transferring || !recipientPreview || walletBalance < 1}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {transferring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Transferring...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Instantly (₹0 Fee)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Transfer History */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Transfer History</span>
            </h2>
            <span className="text-[11px] text-slate-400">
              {history.length} record{history.length !== 1 ? "s" : ""}
            </span>
          </div>

          {historyLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
              Loading transfers...
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No internal transfers yet.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((tx) => {
                const isSent = tx.senderId === currentUserId;
                const counterparty = isSent ? tx.receiver : tx.sender;

                return (
                  <div
                    key={tx.id}
                    className="flex items-start justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isSent
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {isSent ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">
                          {isSent ? "Sent to" : "Received from"}{" "}
                          <span className="text-white">
                            {counterparty.name || counterparty.email}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          ID: {counterparty.userCode} •{" "}
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                        {tx.note && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5">
                            "{tx.note}"
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`font-mono font-bold ${
                        isSent ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {isSent ? "-" : "+"}₹{tx.amountInr.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
