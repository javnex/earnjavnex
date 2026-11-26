"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error without exposing raw trace to users
    console.error("Application error boundary triggered:", error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center selection:bg-blue-600 selection:text-white relative">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-100/60 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-md w-full space-y-6 relative z-10" id="main-content">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500 text-white shadow-[0_10px_25px_rgba(239,68,68,0.25)]">
          <AlertTriangle className="h-8 w-8 text-white" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
            Application Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-2">
            Something went wrong
          </h1>
          <p className="text-xs text-slate-600 font-mono leading-relaxed">
            An unexpected error occurred while executing this request. Our systems have safely isolated the event.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <button
            onClick={() => reset()}
            className="btn-futuristic w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-mono font-bold cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="btn-futuristic-glass w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-mono font-semibold"
          >
            <Home className="h-4 w-4 text-blue-600" />
            <span>Return to Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
