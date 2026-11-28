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
  Copy,
  Check,
  Sparkles,
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
  const { data: session, status, update } = useSession();
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
  const [isSelected, setIsSelected] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopy = (text: string, type: "code" | "email") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const executeLookup = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setRecipientPreview(null);
      setIsSelected(false);
      setLookupError("Please enter at least 2 characters to search.");
      return;
    }
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
        setIsSelected(false);
      } else if (data.user) {
        setRecipientPreview(data.user);
        setLookupError(null);
      } else {
        setRecipientPreview(null);
        setIsSelected(false);
        setLookupError("No registered user found with this User ID or email.");
      }
    } catch {
      setLookupError("Failed to lookup recipient.");
    } finally {
      setLookupLoading(false);
    }
  };

  // Auto search while typing (debounced by 350ms)
  useEffect(() => {
    const trimmed = recipientInput.trim();
    if (trimmed.length < 2) {
      setRecipientPreview(null);
      setIsSelected(false);
      setLookupError(null);
      return;
    }

    // If currently selected user matches input, don't re-search
    if (isSelected && (trimmed === recipientPreview?.email || trimmed === recipientPreview?.userCode)) {
      return;
    }

    const timer = setTimeout(() => {
      executeLookup(trimmed);
    }, 350);

    return () => clearTimeout(timer);
  }, [recipientInput]);

  const handleSelectRecipient = (user: { userCode: string; name: string; email: string }) => {
    setRecipientPreview(user);
    setIsSelected(true);
    setLookupError(null);
  };

  const handleChangeRecipient = () => {
    setIsSelected(false);
  };

  const [transferring, setTransferring] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [history, setHistory] = useState<Transfer[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/transfers", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.transfers || []);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to load transfers:", err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchHistory();
    } else if (status === "unauthenticated") {
      setHistory([]);
      setRecipientPreview(null);
      setHistoryLoading(false);
    }
  }, [status]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPreview || !isSelected) {
      setMessage({ type: "error", text: "Please click to select and confirm the recipient first." });
      return;
    }

    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount < 1) {
      setMessage({ type: "error", text: "Minimum transfer amount is ₹1." });
      return;
    }

    if (amount > walletBalance) {
      setMessage({ type: "error", text: "Insufficient balance." });
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
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <ArrowRightLeft className="h-6 w-6 text-blue-600" />
          <span>Internal Wallet Transfer (₹0 Fee)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Instantly transfer funds to another user or pool rewards from your secondary accounts into one primary ID to reach the ₹100 withdrawal threshold.
        </p>
      </div>

      {/* Your Account Profile Details for Easy Sharing */}
      <div className="glare-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-700 font-mono">Your Transfer Profile</span>
            <span className="border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-xs">₹0 Fee Receiving</span>
          </div>
          <p className="text-xs text-slate-500">Share your User ID or Email to receive funds from other accounts instantly.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] text-slate-400 font-mono">Your ID:</span>
            <code className="text-xs font-mono font-bold text-slate-900">{myUserCode || "USR-XXXXX"}</code>
            <button
              type="button"
              onClick={() => handleCopy(myUserCode, "code")}
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Copy User ID"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] text-slate-400 font-mono">Email:</span>
            <span className="text-xs text-slate-700 truncate max-w-[150px]">{session?.user?.email}</span>
            <button
              type="button"
              onClick={() => handleCopy(session?.user?.email || "", "email")}
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Copy Email"
            >
              {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Notice & Guide */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-slate-700 flex items-start gap-3 shadow-xs">
        <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-blue-950 block font-semibold mb-0.5">
            How Multi-Account Pooling Works:
          </strong>
          If you have multiple accounts, copy your primary account&apos;s User ID (
          <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-700 border border-blue-200 shadow-xs">
            {myUserCode || "USR-XXXXX"}
          </code>
          ). Log into your other accounts, enter that User ID here, and send all ₹10 balances to your main ID with zero fees!
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-xs font-medium border shadow-xs ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs hover:underline text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Transfer Form */}
        <div className="lg:col-span-2">
          <div className="glare-card rounded-2xl p-6 space-y-5 bg-white border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">Send Balance</h2>
              <div className="text-xs text-slate-500 font-mono">
                Available:{" "}
                <strong className="text-emerald-600 font-mono text-sm">
                  ₹{walletBalance.toFixed(2)}
                </strong>
              </div>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              {/* Recipient Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between font-mono">
                  <span>Recipient User ID or Email</span>
                  <span className="text-[11px] text-blue-600 font-semibold">Instant Search</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="e.g. USR-XXXXX or friend@gmail.com"
                      value={recipientInput}
                      onChange={(e) => setRecipientInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          executeLookup(recipientInput);
                        }
                      }}
                      className="futuristic-input w-full rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400"
                    />
                    {lookupLoading && (
                      <div className="absolute right-3 top-3">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => executeLookup(recipientInput)}
                    disabled={lookupLoading || !recipientInput.trim()}
                    className="btn-futuristic-glass px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Search</span>
                  </button>
                </div>

                {/* Recipient Search Result & Selection Card */}
                {recipientPreview && (
                  <div
                    onClick={() => !isSelected && handleSelectRecipient(recipientPreview)}
                    className={`rounded-xl border p-4 text-xs transition-all animate-in fade-in duration-200 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/90 shadow-md ring-2 ring-emerald-500/20"
                        : "border-blue-300 bg-blue-50/70 hover:bg-blue-100/70 hover:border-blue-400 cursor-pointer shadow-xs"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-xs transition-colors ${
                            isSelected
                              ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {recipientPreview.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {recipientPreview.name}
                            </span>
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                                <Check className="h-3 w-3 stroke-[3]" />
                                Selected Recipient
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold border border-blue-200">
                                <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                Recipient Verified
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500 text-xs block mt-0.5 font-mono">
                            {recipientPreview.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className="font-mono bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-xs">
                          {recipientPreview.userCode}
                        </span>

                        {isSelected ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChangeRecipient();
                            }}
                            className="text-[11px] text-blue-600 hover:text-blue-800 underline font-semibold px-2 py-1 cursor-pointer"
                          >
                            Change
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectRecipient(recipientPreview)}
                            className="btn-futuristic px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <span>Click to Select</span>
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {!isSelected && (
                      <div className="mt-2.5 pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-blue-800 font-semibold">
                        <span>👉 Tap anywhere on this card to select this recipient</span>
                        <span className="underline">Select ➔</span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="mt-2.5 pt-2 border-t border-emerald-200 flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Recipient confirmed! Enter amount below and send with ₹0 fees.</span>
                      </div>
                    )}
                  </div>
                )}

                {lookupError && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{lookupError}</span>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700 font-mono">
                    Amount (₹ INR)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAmountInput(String(walletBalance))}
                    className="text-[11px] text-blue-600 hover:underline font-mono transition-colors cursor-pointer"
                  >
                    Max (₹{walletBalance.toFixed(0)})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold font-mono">
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
                    className="futuristic-input w-full rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 font-mono"
                  />
                </div>
              </div>

              {/* Note / Remarks (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 font-mono">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="e.g. Account 2 pooling for payout"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="futuristic-input w-full rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Fee notice & Transfer button */}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-slate-500 pb-3 font-mono">
                  <span>Transfer Fee:</span>
                  <span className="text-emerald-700 font-bold">₹0.00 (Free)</span>
                </div>

                <button
                  type="submit"
                  disabled={transferring || !recipientPreview || walletBalance < 1}
                  className="btn-futuristic w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {transferring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Transferring...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 text-white" />
                      <span>Send Instantly (₹0 Fee)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Transfer History */}
        <div className="glare-card rounded-2xl p-5 space-y-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Transfer History</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              {history.length} record{history.length !== 1 ? "s" : ""}
            </span>
          </div>

          {historyLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 font-mono animate-pulse">
              Loading transfers...
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">
              No internal transfers yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {history.map((tx) => {
                const isSent = tx.senderId === currentUserId;
                const counterparty = isSent ? tx.receiver : tx.sender;

                return (
                  <div
                    key={tx.id}
                    className="flex items-start justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`p-1.5 rounded-lg border ${isSent ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                        {isSent ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {isSent ? "Sent to" : "Received from"}{" "}
                          <span className="text-slate-900 font-bold">
                            {counterparty.name || counterparty.email}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          ID: {counterparty.userCode} •{" "}
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                        {tx.note && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5">
                            &ldquo;{tx.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <span className={`font-mono font-bold text-xs ${isSent ? "text-slate-700" : "text-emerald-700 font-black"}`}>
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
