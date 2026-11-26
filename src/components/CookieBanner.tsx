"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("rr_cookie_consent");
      if (!consent) {
        setVisible(true);
      }
    } catch {}
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("rr_cookie_consent", "accepted_" + Date.now());
      setVisible(false);
    } catch {}
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie and Privacy Consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-white/95 backdrop-blur-2xl rounded-2xl p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <Cookie className="h-4 w-4" />
            </div>
            <span className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
              Cookie & Data Notice
            </span>
          </div>
          <button
            onClick={() => setVisible(false)}
            aria-label="Dismiss cookie notice"
            className="text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 font-sans leading-relaxed">
          We use strictly essential authentication and security cookies to maintain your login session and protect against unauthorized access. We do not use third-party advertising trackers. Read our{" "}
          <Link href="/privacy" className="text-blue-600 font-semibold underline hover:text-blue-700">
            Privacy Notice
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-blue-600 font-semibold underline hover:text-blue-700">
            Terms
          </Link>
          .
        </p>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={handleAccept}
            className="btn-futuristic px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer flex-1"
          >
            Acknowledge & Accept
          </button>
          <Link
            href="/privacy"
            className="btn-futuristic-glass px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-center"
          >
            Learn More
          </Link>
        </div>
      </div>
    </aside>
  );
}
