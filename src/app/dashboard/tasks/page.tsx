"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { generateAiReviewText } from "@/lib/review-generator";
import {
  ListTodo,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Send,
  Loader2,
  Check,
  Copy,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  shopUrl: string;
  instructions: string;
  rewardInr: number;
  maxLimit: number;
  completedCount: number;
  status: string;
}

export default function TasksPage() {
  const { data: session, update } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [proofInputs, setProofInputs] = useState<Record<string, string>>({});
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const reviewerName =
    (session?.user as any)?.name ||
    (session?.user as any)?.email?.split("@")[0] ||
    "Your Google Account";
  const userSeed = (session?.user as any)?.id || "user";

  const handleCopyReview = (taskId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTaskId(taskId);
    setTimeout(() => setCopiedTaskId(null), 2500);
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleInputChange = (taskId: string, val: string) => {
    setProofInputs((prev) => ({ ...prev, [taskId]: val }));
  };

  const handleSubmitProof = async (taskId: string, assignedReviewText?: string) => {
    const proofLink = (proofInputs[taskId] || "").trim();
    if (!proofLink) {
      setMessage({
        type: "error",
        text: "Please paste your review link before submitting.",
      });
      return;
    }

    if (!proofLink.startsWith("http://") && !proofLink.startsWith("https://")) {
      setMessage({
        type: "error",
        text: "Please enter a valid URL starting with https:// or http://",
      });
      return;
    }

    try {
      setSubmittingTaskId(taskId);
      setMessage(null);

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          proofLink,
          assignedReviewText,
          reviewerName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      setMessage({
        type: "success",
        text: data.message || "Review submitted successfully! ₹10 credited to your wallet.",
      });

      // Clear input
      setProofInputs((prev) => ({ ...prev, [taskId]: "" }));

      // Immediately remove task from user's available list
      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      // Update NextAuth session wallet balance if auto-credited
      if (data.newBalance !== undefined) {
        update({ walletBalance: data.newBalance });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Submission failed",
      });
    } finally {
      setSubmittingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ListTodo className="h-6 w-6 text-emerald-400" />
            <span>Available Review Tasks</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete genuine reviews, submit your review public link, and earn ₹10 instantly in your web wallet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
            {tasks.length} Available Task{tasks.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Alert Banner */}
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

      {/* Strict 1-review Rule Notice */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-200">Strict 1 ID = 1 Submission Rule:</strong>{" "}
          Each Google account can only submit 1 review per shop. Once submitted, that shop disappears from your available list. Tasks auto-close for all users when the shop's review limit is reached.
        </span>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400 animate-pulse">
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
          <Sparkles className="h-10 w-10 text-emerald-400/60 mx-auto" />
          <h2 className="text-lg font-bold text-white">No Tasks Available Right Now</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            You have completed all active shop reviews, or active shops have reached their maximum review quota. Check back shortly for new shops!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {tasks.map((task) => {
            const remainingSlots = Math.max(0, task.maxLimit - task.completedCount);
            const percentFilled = Math.min(
              100,
              Math.round((task.completedCount / task.maxLimit) * 100)
            );
            const isSubmitting = submittingTaskId === task.id;
            const assignedReview = generateAiReviewText(task.title, userSeed);

            return (
              <div
                key={task.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-lg shadow-black/30 space-y-4 hover:border-slate-700 transition-all"
              >
                {/* Top: Shop Name & Reward */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{task.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">
                        Remaining Slots:{" "}
                        <strong className="text-emerald-300">
                          {remainingSlots} / {task.maxLimit}
                        </strong>
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-400">
                        {percentFilled}% Filled
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-3 py-1.5 text-sm font-extrabold text-emerald-400 border border-emerald-500/30">
                      +₹{task.rewardInr} INR
                    </span>
                    <a
                      href={task.shopUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
                    >
                      <span>Open Shop Link</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </a>
                  </div>
                </div>

                {/* Slots Progress Bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                    style={{ width: `${percentFilled}%` }}
                  />
                </div>

                {/* Reviewer Account Identity Banner */}
                <div className="flex items-center gap-2.5 rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs">
                  <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300">
                    Post Under Your Google Account:{" "}
                    <strong className="text-white font-bold">{reviewerName}</strong>
                  </span>
                  <span className="ml-auto hidden sm:inline-block text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Name Verified on Google Maps
                  </span>
                </div>

                {/* Assigned AI Review Box */}
                <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-slate-950 to-emerald-950/25 p-4 space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                      <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Your Assigned Review (Copy & Paste on Google Maps)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyReview(task.id, assignedReview)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
                    >
                      {copiedTaskId === task.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Review Text</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-100 font-medium leading-relaxed bg-slate-900/90 p-3 rounded-lg border border-slate-800/80">
                    &ldquo;{assignedReview}&rdquo;
                  </p>
                </div>

                {/* Instructions Box */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 text-xs text-slate-300 space-y-1">
                  <strong className="text-slate-400 uppercase tracking-wider text-[10px] block">
                    Task Steps:
                  </strong>
                  <p className="whitespace-pre-line leading-relaxed font-sans text-slate-300">
                    {task.instructions}
                  </p>
                </div>

                {/* Submit Proof Link Form */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="url"
                    placeholder="Paste your public review URL here (https://maps.app.goo.gl/...)"
                    value={proofInputs[task.id] || ""}
                    onChange={(e) => handleInputChange(task.id, e.target.value)}
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleSubmitProof(task.id, assignedReview)}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit & Earn ₹10</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
