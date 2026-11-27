"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { BellOff, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const [email, setEmail] = useState(emailParam || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleUnsubscribe = async (targetEmail: string) => {
    if (!targetEmail) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/user/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to turn off task alerts");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (emailParam) {
      handleUnsubscribe(emailParam);
    }
  }, [emailParam]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 selection:bg-blue-600 selection:text-white">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
          {success ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          ) : (
            <BellOff className="w-8 h-8 text-slate-600" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {success ? "Task Alerts Turned Off" : "Manage Email Alerts"}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            {success
              ? `You will no longer receive new task email notifications at ${email}. You can re-enable alerts anytime from your dashboard.`
              : "Turn off automated new task broadcast emails from task@javnex.in."}
          </p>
        </div>

        {error && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
            {error}
          </div>
        )}

        {!success && !emailParam && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUnsubscribe(email);
            }}
            className="space-y-3"
          >
            <input
              type="email"
              required
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all disabled:opacity-50"
            >
              {loading ? "Updating..." : "Turn Off Task Alerts"}
            </button>
          </form>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Processing your preference...</span>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-mono text-slate-500">
          Loading...
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
