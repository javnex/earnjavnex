import Link from "next/link";
import { AlertCircle, ArrowLeft, Home, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Specular Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-100/60 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-md w-full space-y-6 relative z-10" id="main-content">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.3)]">
          <AlertCircle className="h-8 w-8 text-white" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Error 404 • Resource Not Found
          </span>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mt-2">
            Lost in Space
          </h1>
          <p className="text-xs text-slate-600 font-mono leading-relaxed">
            The page or terminal endpoint you requested does not exist or has been relocated to another orbit.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <Link
            href="/"
            className="btn-futuristic w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-mono font-bold"
          >
            <Home className="h-4 w-4" />
            <span>Return to Home</span>
          </Link>

          <Link
            href="/dashboard"
            className="btn-futuristic-glass w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-mono font-semibold"
          >
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span>Go to Dashboard</span>
          </Link>
        </div>

        <div className="pt-2 text-[11px] font-mono text-slate-400">
          ReviewReward Security & Routing Gateway
        </div>
      </div>
    </div>
  );
}
