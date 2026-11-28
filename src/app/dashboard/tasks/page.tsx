"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { generateFallbackReviewText } from "@/lib/review-generator";
import {
  getAssignedStarRating,
  extractTaskTargetRating,
} from "@/lib/rating-balancer";
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
  Star,
  AlertTriangle,
  X,
  Zap,
  ArrowRight,
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
  targetRating?: number;
  assignedStars?: 3 | 4 | 5;
  assignedReview?: string;
}

interface CheckState {
  id: "shop" | "account" | "stars" | "text";
  label: string;
  description: string;
  status: "pending" | "running" | "passed" | "failed";
  details?: string;
}

interface VerificationModalState {
  isOpen: boolean;
  taskId: string;
  taskTitle: string;
  rewardInr: number;
  shopUrl: string;
  assignedStars: number;
  assignedReviewText: string;
  expectedReviewer: string;
  proofLink: string;
  isVerifying: boolean;
  isComplete: boolean;
  isApproved: boolean;
  error?: string;
  failingStep?: "shop" | "account" | "stars" | "text" | "duplicate";
  newBalance?: number;
  checks: CheckState[];
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

  const [verificationModal, setVerificationModal] = useState<VerificationModalState | null>(null);

  const reviewerName =
    (session?.user as any)?.name ||
    (session?.user as any)?.email?.split("@")[0] ||
    "Your Account Name";
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

  const handleSubmitProof = async (
    taskId: string,
    assignedReviewText?: string,
    assignedStars?: number
  ) => {
    if (!session) {
      signIn("google", { callbackUrl: window.location.href });
      return;
    }

    const proofLink = proofInputs[taskId]?.trim();
    if (!proofLink) {
      setMessage({ type: "error", text: "Please paste your public task proof link." });
      return;
    }

    const currentTask = tasks.find((t) => t.id === taskId);
    const requiredStars = assignedStars || currentTask?.assignedStars || 5;
    const taskTitle = currentTask?.title || "Store Listing";
    const shopUrl = currentTask?.shopUrl || "";
    const taskReward = currentTask?.rewardInr || 20;
    const reviewText = assignedReviewText || currentTask?.assignedReview || "";

    // Initialize 4-Check Verification State
    const initialChecks: CheckState[] = [
      {
        id: "shop",
        label: "Store Listing & CID Match",
        description: `Verifying review belongs to "${taskTitle}"`,
        status: "running",
      },
      {
        id: "account",
        label: "Google Account Identity Match",
        description: `Verifying review author matches logged-in account "${reviewerName}"`,
        status: "pending",
      },
      {
        id: "stars",
        label: "Star Rating Compliance",
        description: `Verifying review was given exactly ${requiredStars} Stars`,
        status: "pending",
      },
      {
        id: "text",
        label: "Review Text Compliance",
        description: "Verifying published review matches assigned text",
        status: "pending",
      },
    ];

    setVerificationModal({
      isOpen: true,
      taskId,
      taskTitle,
      rewardInr: taskReward,
      shopUrl,
      assignedStars: requiredStars,
      assignedReviewText: reviewText,
      expectedReviewer: reviewerName,
      proofLink,
      isVerifying: true,
      isComplete: false,
      isApproved: false,
      checks: initialChecks,
    });

    setSubmittingTaskId(taskId);
    setMessage(null);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          proofLink,
          assignedReviewText: reviewText,
          reviewerName,
          assignedStars: requiredStars,
        }),
      });

      const data = await res.json();

      if (res.ok && data.approved) {
        // Success: all 4 checks passed!
        const passedChecks: CheckState[] = [
          {
            id: "shop",
            label: "Store Listing & CID Match",
            description: data.checks?.shopMatch?.details || `Store verified (${taskTitle})`,
            status: "passed",
          },
          {
            id: "account",
            label: "Google Account Identity Match",
            description: data.checks?.accountMatch?.details || `Account verified (${reviewerName})`,
            status: "passed",
          },
          {
            id: "stars",
            label: "Star Rating Compliance",
            description: data.checks?.starsMatch?.details || `${requiredStars} Stars verified`,
            status: "passed",
          },
          {
            id: "text",
            label: "Review Text Compliance",
            description: data.checks?.textMatch?.details || "Assigned text confirmed",
            status: "passed",
          },
        ];

        setVerificationModal((prev) =>
          prev
            ? {
                ...prev,
                isVerifying: false,
                isComplete: true,
                isApproved: true,
                newBalance: data.newBalance,
                checks: passedChecks,
              }
            : null
        );

        // Clear proof input and remove completed task
        setProofInputs((prev) => ({ ...prev, [taskId]: "" }));
        setTasks((prev) => prev.filter((t) => t.id !== taskId));

        // Update NextAuth session wallet balance
        if (data.newBalance !== undefined) {
          update({ walletBalance: data.newBalance });
        }
      } else {
        // Failure: determine failing step and reflect in checks checklist
        const errorMsg = data.error || "Verification failed";
        const failingStep = data.failingStep || "shop";

        const evaluatedChecks: CheckState[] = [
          {
            id: "shop",
            label: "Store Listing & CID Match",
            description:
              failingStep === "shop"
                ? data.checks?.shopMatch?.details || errorMsg
                : `Store verified (${taskTitle})`,
            status: failingStep === "shop" ? "failed" : "passed",
          },
          {
            id: "account",
            label: "Google Account Identity Match",
            description:
              failingStep === "account" || failingStep === "duplicate"
                ? data.checks?.accountMatch?.details || errorMsg
                : failingStep === "shop"
                ? `Pending store verification`
                : `Account verified (${reviewerName})`,
            status:
              failingStep === "account" || failingStep === "duplicate"
                ? "failed"
                : failingStep === "shop"
                ? "pending"
                : "passed",
          },
          {
            id: "stars",
            label: "Star Rating Compliance",
            description:
              failingStep === "stars"
                ? data.checks?.starsMatch?.details || errorMsg
                : failingStep === "shop" || failingStep === "account" || failingStep === "duplicate"
                ? `Required: ${requiredStars} Stars`
                : `${requiredStars} Stars verified`,
            status:
              failingStep === "stars"
                ? "failed"
                : failingStep === "text"
                ? "passed"
                : "pending",
          },
          {
            id: "text",
            label: "Review Text Compliance",
            description:
              failingStep === "text"
                ? data.checks?.textMatch?.details || errorMsg
                : "Required assigned task text",
            status: failingStep === "text" ? "failed" : "pending",
          },
        ];

        setVerificationModal((prev) =>
          prev
            ? {
                ...prev,
                isVerifying: false,
                isComplete: true,
                isApproved: false,
                error: errorMsg,
                failingStep,
                checks: evaluatedChecks,
              }
            : null
        );
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to reach verification terminal";
      setVerificationModal((prev) =>
        prev
          ? {
              ...prev,
              isVerifying: false,
              isComplete: true,
              isApproved: false,
              error: errorMsg,
              checks: prev.checks.map((c, i) =>
                i === 0 ? { ...c, status: "failed", description: errorMsg } : c
              ),
            }
          : null
      );
    } finally {
      setSubmittingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <ListTodo className="h-6 w-6 text-blue-600" />
            <span>Available Tasks</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete assigned tasks, paste your proof link, and earn rewards instantly in your web wallet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-mono font-bold text-blue-700 shadow-xs">
            {tasks.length} Task{tasks.length !== 1 ? "s" : ""} Available
          </span>
        </div>
      </div>

      {/* Unauthenticated Sign-in Notice */}
      {!session && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50/60 to-blue-50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shrink-0 shadow-xs">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Sign In to Claim Your Wallet Rewards</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                You are currently viewing tasks as a guest. Sign in with Google so your task rewards are credited directly to your account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: window.location.href })}
            className="btn-futuristic inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer shrink-0"
          >
            <span>Sign in with Google</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Alert Banner */}
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

      {/* Anti-Spam & Stealth Pacing Advisory Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/90 p-4 sm:p-5 text-xs text-slate-700 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 font-black text-blue-950 uppercase tracking-wide">
          <ShieldAlert className="h-4 w-4 text-blue-600 shrink-0" />
          <span>Anti-Spam & Natural Stealth Pacing Active</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
          To protect client listings (50–200 existing listings) from automated spam filters, this terminal enforces natural organic growth standards:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-700">
          <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-blue-100 shadow-2xs">
            <span className="text-emerald-600 font-bold shrink-0">✓</span>
            <span><strong>Natural Velocity Drip:</strong> Listings capped at daily limits to prevent sudden burst anomalies.</span>
          </div>
          <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-blue-100 shadow-2xs">
            <span className="text-emerald-600 font-bold shrink-0">✓</span>
            <span><strong>Organic Search Discovery:</strong> Use &ldquo;Search on Maps&rdquo; to simulate natural search navigation.</span>
          </div>
          <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-blue-100 shadow-2xs">
            <span className="text-emerald-600 font-bold shrink-0">✓</span>
            <span><strong>Personal Mobile Data (4G/5G):</strong> Post on your own cellular network, not public shared Wi-Fi.</span>
          </div>
          <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-blue-100 shadow-2xs">
            <span className="text-emerald-600 font-bold shrink-0">✓</span>
            <span><strong>10-Min Pacing Cooldown:</strong> Enforced between tasks to de-synchronize bot detection algorithms.</span>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="glare-card rounded-2xl p-12 text-center text-slate-400 font-mono text-xs animate-pulse bg-white border border-slate-200">
          Loading active task listings...
        </div>
      ) : tasks.length === 0 ? (
        <div className="glare-card rounded-2xl p-12 text-center space-y-3 bg-white border border-slate-200">
          <Sparkles className="h-8 w-8 text-blue-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Open Tasks Right Now</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You have submitted all active listings, or quotas have been met. Check back shortly for newly listed shops!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const isSubmitting = submittingTaskId === task.id;
            const remainingSlots = Math.max(0, task.maxLimit - task.completedCount);
            const percentFilled = Math.min(
              100,
              Math.round((task.completedCount / task.maxLimit) * 100)
            );

            const targetRating = extractTaskTargetRating(task);
            const assignedStars =
              task.assignedStars ||
              getAssignedStarRating({
                taskId: task.id,
                userId: userSeed,
                totalReviews: task.maxLimit,
                targetRating,
              }).rating;
            const assignedReview =
              task.assignedReview ||
              generateFallbackReviewText(task.title, userSeed, assignedStars);

            return (
              <div
                key={task.id}
                className="glare-card rounded-2xl p-5 sm:p-6 space-y-4 relative overflow-hidden bg-white border border-slate-200 hover:border-blue-300"
              >
                {/* Top: Shop Name & Reward */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">{task.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">
                        Slots:{" "}
                        <strong className="text-slate-900 tabular-nums">
                          {remainingSlots} / {task.maxLimit}
                        </strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {percentFilled}% Filled
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-black text-emerald-700 shadow-xs tabular-nums">
                      +₹{task.rewardInr} INR
                    </span>
                  </div>
                </div>

                {/* Slots Progress Bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                    style={{ width: `${percentFilled}%` }}
                  />
                </div>

                {/* Reviewer Account Identity Banner */}
                <div className="flex items-center gap-2.5 rounded-xl bg-blue-50/60 border border-blue-100 p-3 text-xs">
                  <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-slate-700">
                    Post Under Your Registered Account:{" "}
                    <strong className="text-slate-900 font-bold">{reviewerName}</strong>
                  </span>
                  <span className="ml-auto hidden sm:inline-block text-[10px] text-blue-700 font-bold bg-white px-2.5 py-0.5 rounded-full border border-blue-200 shadow-xs">
                    Profile Name Verified
                  </span>
                </div>

                {/* Assigned Star Rating Required Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-amber-50/70 border border-amber-200 p-3.5 text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-amber-900 font-bold uppercase text-[11px] tracking-wider">
                      Assigned Rating:
                    </span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < assignedStars
                              ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                              : "fill-transparent text-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-black text-amber-900 tabular-nums">
                      ({assignedStars} Stars Required)
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-800 font-medium">
                    Must give exactly {assignedStars} stars on the store listing
                  </span>
                </div>

                {/* 3-Step Action Flow Box */}
                <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-b from-blue-50/50 via-slate-50/30 to-white p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                        <Zap className="h-3.5 w-3.5 fill-white" />
                      </span>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Complete Task in 3 Simple Clicks
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          1. Copy Text ➔ 2. Open Store Listing ➔ 3. Paste link to verify
                        </p>
                      </div>
                    </div>
                    <span className="self-start sm:self-center text-xs font-black text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-full shadow-2xs tabular-nums">
                      +₹{task.rewardInr} Instant Credit
                    </span>
                  </div>

                  {/* CLICK 1: Copy Text */}
                  <div
                    className={`rounded-xl border p-3.5 space-y-2.5 transition-all ${
                      copiedTaskId === task.id
                        ? "bg-emerald-50/80 border-emerald-300 shadow-xs"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white transition-colors ${
                            copiedTaskId === task.id ? "bg-emerald-600" : "bg-blue-600"
                          }`}
                        >
                          {copiedTaskId === task.id ? "✓" : "1"}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Click 1: Copy Assigned Text
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyReview(task.id, assignedReview)}
                        className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                          copiedTaskId === task.id
                            ? "bg-emerald-600 text-white"
                            : "btn-futuristic"
                        }`}
                      >
                        {copiedTaskId === task.id ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-800 font-medium leading-relaxed italic select-all shadow-inner">
                      &ldquo;{assignedReview}&rdquo;
                    </div>
                  </div>

                  {/* CLICK 2: Open Shop Link & Paste Review */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                          2
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Click 2: Open Shop on Maps
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.title)}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          referrerPolicy="no-referrer"
                          onClick={() => {
                            if (navigator?.clipboard?.writeText) {
                              navigator.clipboard.writeText(assignedReview);
                              setCopiedTaskId(task.id);
                            }
                          }}
                          className="btn-futuristic inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                          title="Search on Maps for natural organic discovery"
                        >
                          <span>🔍 Search on Maps (Organic)</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>

                        <a
                          href={task.shopUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          referrerPolicy="no-referrer"
                          onClick={() => {
                            if (navigator?.clipboard?.writeText) {
                              navigator.clipboard.writeText(assignedReview);
                              setCopiedTaskId(task.id);
                            }
                          }}
                          className="btn-futuristic-glass inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-all cursor-pointer shadow-xs"
                          title="Direct link with referrer stripped"
                        >
                          <span>Direct Link</span>
                          <ExternalLink className="h-3 w-3 text-slate-400" />
                        </a>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                      📍 <strong>Safe Organic Flow:</strong> Tap <strong>&ldquo;Search on Maps&rdquo;</strong> ➔ Select <strong>{task.title}</strong> ➔ Give <strong>{assignedStars} stars</strong> ➔ Paste the text (already copied in your clipboard) ➔ Tap <strong>Post</strong>. Then tap <strong>Share ➔ Copy link</strong>.
                    </p>
                  </div>

                  {/* CLICK 3: Paste Proof Link & Verify */}
                  <div className="rounded-xl border border-emerald-200/90 bg-white p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white">
                        3
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        Click 3: Paste Proof Link & Verify
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          placeholder="Paste public proof URL (https://share.google/... or https://maps.app.goo.gl/...)"
                          value={proofInputs[task.id] || ""}
                          onChange={(e) => handleInputChange(task.id, e.target.value)}
                          disabled={isSubmitting}
                          className="futuristic-input w-full rounded-xl pl-3.5 pr-16 py-2.5 text-xs text-slate-900 placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) handleInputChange(task.id, text.trim());
                            } catch (err) {
                              // Ignore clipboard permission errors
                            }
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-bold text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all cursor-pointer"
                        >
                          Paste
                        </button>
                      </div>

                      {!session ? (
                        <button
                          type="button"
                          onClick={() => signIn("google", { callbackUrl: window.location.href })}
                          className="btn-futuristic inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/25 transition-all cursor-pointer shrink-0"
                        >
                          <Zap className="h-3.5 w-3.5 fill-white" />
                          <span>Sign In to Verify & Earn ₹{task.rewardInr}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSubmitProof(task.id, assignedReview, assignedStars)}
                          disabled={isSubmitting || !proofInputs[task.id]?.trim()}
                          className="btn-green-accent inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Verify & Earn ₹{task.rewardInr}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Admin Instructions if any */}
                {task.instructions && (
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3 text-xs text-slate-600">
                    <strong className="text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                      Shop Instructions:
                    </strong>
                    <p className="whitespace-pre-line leading-relaxed text-slate-700">
                      {task.instructions}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Live 4-Point Automated Verification Modal Dialog */}
      {verificationModal && verificationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 text-slate-900 max-h-[92vh] overflow-y-auto">
            {/* Close X Button */}
            {!verificationModal.isVerifying && (
              <button
                type="button"
                onClick={() => setVerificationModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* Modal Header */}
            <div className="flex items-center gap-3 pr-8">
              <div
                className={`h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                  verificationModal.isVerifying
                    ? "bg-blue-50 border-blue-200 text-blue-600 animate-pulse"
                    : verificationModal.isApproved
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : "bg-rose-50 border-rose-200 text-rose-600"
                }`}
              >
                {verificationModal.isVerifying ? (
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                ) : verificationModal.isApproved ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {verificationModal.isVerifying
                    ? "Automated Review Verification"
                    : verificationModal.isApproved
                    ? "🎉 Verification Passed!"
                    : "Task Verification Failed"}
                </h3>
                <p className="text-xs text-slate-500">
                  {verificationModal.isVerifying
                    ? "Verifying live review across 4 quality criteria in real-time"
                    : verificationModal.isApproved
                    ? `All 4 checks passed! ₹${verificationModal.rewardInr} credited to your wallet`
                    : "Submission rejected by automated anti-cheat standard"}
                </p>
              </div>
            </div>

            {/* Submitted Proof Link Banner */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                <span>Submitted Proof Link (Fresh Live Check)</span>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono text-[9px]">
                  Direct Link
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-mono font-semibold text-slate-800 truncate"
                  title={verificationModal.proofLink}
                >
                  {verificationModal.proofLink}
                </span>
                <a
                  href={verificationModal.proofLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline shrink-0"
                >
                  <span>Test in Incognito</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* 4-POINT LIVE CHECKLIST */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                <span>Verification Criteria</span>
                <span>Status</span>
              </div>

              {verificationModal.checks.map((check, idx) => {
                const isPassed = check.status === "passed";
                const isFailed = check.status === "failed";
                const isRunning = check.status === "running";

                return (
                  <div
                    key={check.id}
                    className={`flex items-start justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                      isPassed
                        ? "bg-emerald-50/70 border-emerald-200/90 text-emerald-950"
                        : isFailed
                        ? "bg-rose-50/80 border-rose-200 text-rose-950"
                        : isRunning
                        ? "bg-blue-50/80 border-blue-200 text-blue-950 shadow-xs"
                        : "bg-white/60 border-slate-200/70 text-slate-600"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {isPassed ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold shrink-0 mt-0.5">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      ) : isFailed ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white font-bold shrink-0 mt-0.5">
                          <X className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      ) : isRunning ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shrink-0 mt-0.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                        </div>
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-[10px] font-mono font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                      )}

                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold leading-tight">{check.label}</h4>
                        <p className="text-[11px] opacity-80 leading-snug">{check.description}</p>
                      </div>
                    </div>

                    <div className="shrink-0 self-center">
                      {isPassed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                          Passed ✓
                        </span>
                      ) : isFailed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                          Failed ❌
                        </span>
                      ) : isRunning ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200 animate-pulse">
                          Checking...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VERIFICATION APPROVED STATE */}
            {verificationModal.isApproved && (
              <div className="rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-emerald-900">
                      Reward Credited: +₹{verificationModal.rewardInr} INR
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Funds deposited directly to your web wallet balance.
                    </p>
                  </div>
                  {verificationModal.newBalance !== undefined && (
                    <span className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black text-emerald-800 shadow-xs tabular-nums">
                      Balance: ₹{verificationModal.newBalance}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setVerificationModal(null)}
                  className="w-full btn-green-accent py-3 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Done & Continue Earning</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* VERIFICATION FAILED STATE */}
            {verificationModal.isComplete && !verificationModal.isApproved && (
              <div className="space-y-4">
                {/* Rejection Alert */}
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-800 block">
                    Rejection Explanation:
                  </span>
                  <p className="text-xs font-semibold text-rose-900 leading-relaxed font-sans">
                    {verificationModal.error}
                  </p>
                  {(verificationModal.error?.includes("no longer available") ||
                    verificationModal.error?.includes("shadow-banned") ||
                    verificationModal.error?.includes("Shadow-Ban")) && (
                    <div className="mt-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-[11px] space-y-1.5 font-sans">
                      <strong className="block font-bold text-amber-900">
                        Why does Google Maps show &ldquo;This review is no longer available&rdquo;?
                      </strong>
                      <p className="text-slate-700 leading-relaxed">
                        Google&rsquo;s automated anti-spam algorithms automatically hide reviews with very short text (like &ldquo;ok ok experiance&rdquo;) or rapid posts from public view. While it may show inside your own Google Maps app, it is <strong>suppressed from public visitors</strong> (and our verification system).
                      </p>
                      <p className="font-semibold text-amber-900 pt-1">
                        👉 Click &ldquo;Test in Incognito&rdquo; above to verify Google&rsquo;s message yourself. To fix: edit your review on Google Maps to write a natural 1–2 sentence feedback, wait 2–3 minutes, and verify again.
                      </p>
                    </div>
                  )}
                </div>

                {/* Step-by-Step Fix Instructions */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] font-mono block">
                    How to Fix & Re-Verify
                  </span>

                  {/* Required Stars */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="font-medium text-xs font-mono">Assigned Rating Required:</span>
                    <span className="font-bold font-mono bg-white px-2 py-0.5 rounded text-amber-900 flex items-center gap-1 text-xs border border-amber-200 shadow-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {verificationModal.assignedStars} Stars Exactly
                    </span>
                  </div>

                  {/* Assigned text preview with copy */}
                  {verificationModal.assignedReviewText && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[11px] font-medium font-mono">Your Assigned Text:</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyReview("modal", verificationModal.assignedReviewText)
                          }
                          className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                        >
                          {copiedTaskId === "modal" ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="p-3 rounded-lg bg-white border border-slate-200 text-slate-800 font-sans text-xs italic leading-relaxed shadow-xs">
                        &ldquo;{verificationModal.assignedReviewText}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-200">
                    <p>
                      1. Open the store listing on Google Maps using your own account (
                      <strong>{verificationModal.expectedReviewer}</strong>).
                    </p>
                    <p>
                      2. Give exactly <strong>{verificationModal.assignedStars} Stars</strong> and paste
                      the assigned text.
                    </p>
                    <p>
                      3. Tap <strong>Post</strong>, then copy your public share link and click{" "}
                      <strong>Verify & Earn</strong> again.
                    </p>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  {verificationModal.shopUrl && (
                    <a
                      href={verificationModal.shopUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-1/2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                    >
                      <span>Open Store Listing</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setVerificationModal(null)}
                    className="btn-futuristic w-full sm:flex-1 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    I Understand, Close & Fix
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
