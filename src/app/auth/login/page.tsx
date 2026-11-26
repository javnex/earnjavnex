"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, Zap, ArrowRight, CheckCircle2, Lock, AlertCircle } from "lucide-react";

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [loading, setLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentError, setConsentError] = useState(false);

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleGoogleLogin = async () => {
    if (!consentGiven) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Soft Ambient Blue Glare */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-blue-500/[0.08] via-indigo-500/[0.03] to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-8 relative z-10" id="main-content">
        {/* Brand Header with Official Uploaded Logo */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block group">
            <div className="relative mx-auto h-20 w-20">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded-2xl blur-md group-hover:blur-lg transition-all" />
              <img
                src="/logo.png"
                alt="ReviewReward Logo"
                className="relative h-20 w-20 object-contain rounded-2xl shadow-md border border-slate-200 bg-white p-1.5 transition-transform group-hover:scale-105"
              />
            </div>
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Review<span className="text-blue-600">Reward</span>
          </h1>
          <p className="text-xs text-slate-500">
            Earn ₹10 per review. Transfer with ₹0 fees. Fast ₹100 bank payouts.
          </p>
        </div>

        {/* Login Card */}
        <div className="glare-card rounded-3xl p-7 sm:p-8 space-y-6 bg-white border border-slate-200 shadow-xl shadow-blue-900/5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 font-mono uppercase tracking-wider">Access Terminal</h2>
            <p className="text-xs text-slate-500">
              Sign in to access your available tasks and web wallet.
            </p>
          </div>

          {/* Error Banner if Redirected with an OAuth Error */}
          {errorParam && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Authentication Notice ({errorParam})</strong>
                <span>
                  {errorParam === "OAuthSignin"
                    ? "Could not initiate Google Sign-in. Please ensure Google OAuth credentials and redirect URIs are active in your Cloudflare environment."
                    : errorParam === "OAuthCallback"
                    ? "Error receiving response from Google. Verify the Authorized Redirect URI in Google Cloud Console."
                    : errorParam === "AccessDenied"
                    ? "Sign in was cancelled or access denied."
                    : "An authentication error occurred. Please try again."}
                </span>
              </div>
            </div>
          )}

          {/* Explicit Affirmative Consent Checkbox under India DPDP Act 2023 */}
          <div className={`p-3.5 rounded-2xl transition-all border space-y-2 ${
            consentError
              ? "bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/20"
              : "bg-blue-50/70 border-blue-200"
          }`}>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => {
                  setConsentGiven(e.target.checked);
                  if (e.target.checked) setConsentError(false);
                }}
                className="mt-0.5 h-4 w-4 rounded border-blue-300 bg-white text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-slate-700 font-sans leading-relaxed">
                I am <strong>18 years of age or older</strong>, and I provide my free, specific, and affirmative consent to the processing of my digital personal data under the{" "}
                <Link href="/privacy" target="_blank" className="text-blue-600 underline font-semibold hover:text-blue-800">
                  Privacy Notice
                </Link>{" "}
                and agree to the{" "}
                <Link href="/terms" target="_blank" className="text-blue-600 underline font-semibold hover:text-blue-800">
                  Terms of Service
                </Link>
                .
              </span>
            </label>
            {consentError && (
              <p className="text-[11px] font-semibold text-rose-600 pt-1 flex items-center gap-1">
                <span>⚠️ Please check this box to confirm your consent before proceeding.</span>
              </p>
            )}
          </div>

          {/* Google Sign-in Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading || status === "loading"}
            className="btn-futuristic w-full flex items-center justify-center gap-3 rounded-2xl px-5 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#ffffff"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.1 3.665-5.2 3.665-9.12z"
              />
              <path
                fill="#ffffff"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.31 7.31 24 12 24z"
              />
              <path
                fill="#ffffff"
                d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.43l4.02-3.14z"
              />
              <path
                fill="#ffffff"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.26 6.57l4.02 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          {/* Key platform perks */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Strict 1 review per shop per account</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>₹0 Fee Internal Transfers to pool multiple accounts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Fast ₹100 direct bank withdrawals with +14% fee buffer</span>
            </div>
          </div>
        </div>

        {/* Back to Home & Legal Links */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="text-xs font-mono text-slate-500 hover:text-blue-600 transition-colors"
          >
            ← Back to Home
          </Link>
          <div className="flex justify-center gap-3 text-[11px] font-mono text-slate-400">
            <Link href="/privacy" className="hover:text-blue-600 underline">Privacy Notice</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-blue-600 underline">Terms</Link>
            <span>•</span>
            <Link href="/grievance" className="hover:text-blue-600 underline">Grievance Officer</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-mono text-slate-400">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
