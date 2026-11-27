import Link from "next/link";
import { FileText, ArrowLeft, ShieldCheck, CheckCircle2, AlertOctagon } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service and user rules for completing online micro-tasks, zero-fee internal transfers, and fast bank withdrawals on EarnReward.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white relative">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-blue-500/[0.08] via-indigo-500/[0.03] to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="border-b border-slate-200/90 bg-white/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-mono text-slate-600 hover:text-blue-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Platform</span>
          </Link>
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            Terms of Service
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10" id="main-content">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-mono font-bold text-blue-800 backdrop-blur-md">
            <FileText className="h-3.5 w-3.5 text-blue-600" />
            <span>User Agreement & Micro-Task Governance</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
            Terms & Conditions
          </h1>
          <p className="text-xs font-mono text-slate-500">
            Last Updated: November 2026 • Effective Date: November 2026 • Version 1.2
          </p>
        </div>

        <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">01.</span>
              <span>Acceptance of Agreement</span>
            </h2>
            <p>
              By accessing, browsing, or authenticating into EarnReward (&quot;Platform&quot;), you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service and our statutory Privacy Notice. If you do not agree with any part of these terms, you must discontinue platform use immediately.
            </p>
          </section>

          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">02.</span>
              <span>Eligibility & Account Authenticity</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs font-mono">
              <li>You must be at least 18 years of age and legally competent to enter into binding agreements under Indian law.</li>
              <li>Authentication is performed exclusively via verified user authentication accounts.</li>
              <li>You are strictly responsible for maintaining the confidentiality of your account credentials.</li>
              <li>We reserve the right to suspend or terminate accounts suspected of automated bot participation or identity falsification.</li>
            </ul>
          </section>

          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">03.</span>
              <span>Task Rules & Quota Control</span>
            </h2>
            <p>
              EarnReward connects users to active shop tasks with strict programmatic constraints:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 text-xs">
              <li><strong className="text-slate-900 font-mono">Strict 1 Task per Shop per Account:</strong> Each user account may submit at most one verified task per shop task listing. Multiple submissions to the same shop task from the same account are blocked.</li>
              <li><strong className="text-slate-900 font-mono">Proof Verification:</strong> Users must submit a valid public review proof URL containing the assigned review content and star rating. Submitting broken, private, or irrelevant URLs will lead to rejection.</li>
              <li><strong className="text-slate-900 font-mono">Quota Auto-Close:</strong> Each task listing has a maximum review limit set by the administrator. Once the quota is reached, the task automatically closes.</li>
              <li><strong className="text-slate-900 font-mono">Task Reward:</strong> Each verified review credits ₹10.00 INR directly into the user&apos;s internal web wallet.</li>
            </ul>
          </section>

          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">04.</span>
              <span>Internal Wallet & Zero-Fee P2P Pooling</span>
            </h2>
            <p>
              Platform users who maintain multiple legitimate user accounts may pool their task rewards into a single designated primary account:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs font-mono">
              <li>Internal wallet transfers are completely free of charge (₹0 fee).</li>
              <li>Transfers can be executed by entering the recipient&apos;s unique User ID (e.g. <code>USR-XXXXX</code>) or registered email.</li>
              <li>Self-transfers are programmatically blocked.</li>
              <li>Internal wallet funds cannot be traded or transferred outside the platform ecosystem except via official USDT withdrawal dispatches.</li>
            </ul>
          </section>

          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">05.</span>
              <span>Polygon USDT Payouts & Blockchain Finality</span>
            </h2>
            <p>
              Withdrawals are disbursed exclusively in Tether (USDT) on the Polygon (MATIC) Proof-of-Stake network:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 text-xs">
              <li><strong className="text-slate-900 font-mono">Minimum Threshold:</strong> The minimum withdrawal amount is ₹100 INR (equivalent to 10 verified tasks).</li>
              <li><strong className="text-slate-900 font-mono">6% Bank Cash-Out Buffer:</strong> To protect users against Indian crypto exchange trading spreads and the statutory 1% TDS when converting USDT to INR, EarnReward automatically adds a 6% bonus (disbursing ~₹106 worth of USDT for every ₹100 requested).</li>
              <li><strong className="text-slate-900 font-mono">Address Accuracy:</strong> Users must supply an authentic 42-character Polygon EVM wallet address. Because blockchain transactions are immutable, disbursements sent to incorrect or non-EVM addresses cannot be recovered or refunded.</li>
            </ul>
          </section>

          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">06.</span>
              <span>Prohibited Activities & Anti-Fraud Policy</span>
            </h2>
            <p>
              Users are strictly prohibited from engaging in sybil attacks, deploying automated bot scripts, reverse-engineering platform APIs, submitting counterfeit or stolen review URLs, or attempting to compromise platform security. Violation of these provisions results in immediate account forfeiture and permanent blacklisting.
            </p>
          </section>

          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">07.</span>
              <span>Governing Law & Dispute Resolution</span>
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to platform usage shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 font-mono mt-16">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p>© 2026 EarnReward. All rights reserved.</p>
          <div className="flex justify-center gap-4 text-slate-500">
            <Link href="/privacy" className="hover:text-blue-600">Privacy Notice</Link>
            <span>•</span>
            <Link href="/refund" className="hover:text-blue-600">Refund & Payout Policy</Link>
            <span>•</span>
            <Link href="/grievance" className="hover:text-blue-600">Grievance Redressal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
