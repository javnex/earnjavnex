"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 shadow-xl shadow-emerald-500/20">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Review<span className="text-emerald-400">Reward</span>
          </h1>
          <p className="text-sm text-slate-400">
            Earn ₹10 per review. Transfer with ₹0 fees. Withdraw in instant USDT.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-7 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">Welcome back</h2>
            <p className="text-xs text-slate-400">
              Sign in with your Google account to access your tasks and web wallet.
            </p>
          </div>

          {/* Google Sign-in Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading || status === "loading"}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 px-4 py-3.5 text-sm font-semibold text-white shadow-md hover:border-slate-600 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.1 3.665-5.2 3.665-9.12z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.31 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.43l4.02-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.26 6.57l4.02 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          {/* Key platform perks */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Strict 1 review per shop per Google account</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>₹0 Fee Internal Transfers to pool multiple IDs</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Instant Polygon USDT payouts with 6% bank cashout buffer</span>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
          >
            <span>Learn more about how ReviewReward works</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
