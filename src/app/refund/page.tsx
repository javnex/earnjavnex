import Link from "next/link";
import { ArrowLeft, Wallet, CheckCircle2, ShieldAlert, Zap, RefreshCw } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payout & Refund Policy",
  description:
    "Official payout and refund terms for EarnReward micro-task earnings, 6% cash-out fee buffers, and bank IMPS disbursement rules.",
  alternates: {
    canonical: "/refund",
  },
};

export default function RefundPolicyPage() {
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
            Payout & Refund Policy
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10" id="main-content">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-mono font-bold text-blue-800 backdrop-blur-md">
            <Wallet className="h-3.5 w-3.5 text-blue-600" />
            <span>Financial Settlement & Payout Transparency</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
            Refund, Withdrawal & Payout Policy
          </h1>
          <p className="text-xs font-mono text-slate-500">
            Last Updated: November 2026 • Effective Date: November 2026 • Version 1.2
          </p>
        </div>

        <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
          {/* Section 1 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">01.</span>
              <span>Nature of Task Earnings</span>
            </h2>
            <p>
              Credits stored in your EarnReward web wallet represent earned micro-task rewards denominated in Indian Rupees (INR) at the fixed rate of ₹10.00 INR per verified task. These balances are not deposits, banking balances, or securities.
            </p>
          </section>

          {/* Section 2 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">02.</span>
              <span>Withdrawal Threshold & Minimums</span>
            </h2>
            <p>
              Users may initiate an automated cryptocurrency withdrawal once their account balance reaches the platform minimum threshold of <strong>₹100.00 INR</strong> (achievable through 10 verified reviews or pooled via internal P2P transfers). Requests below this threshold cannot be processed due to blockchain gas and payment rail minimums.
            </p>
          </section>

          {/* Section 3 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">03.</span>
              <span>Guaranteed 6% Bank Cash-Out Conversion Buffer</span>
            </h2>
            <p>
              When Indian users sell USDT for INR on exchanges such as CoinDCX, Mudrex, or CoinSwitch, exchange spreads and a statutory 1% Tax Deducted at Source (TDS) under Section 194S of the Income Tax Act apply.
            </p>
            <div className="glass-panel p-4 rounded-xl space-y-2 font-mono text-xs bg-emerald-50/70 border border-emerald-200 text-emerald-950">
              <div className="font-bold text-emerald-900">How the 6% Buffer Works:</div>
              <p className="text-emerald-800">
                On every ₹100 withdrawal requested, EarnReward automatically adds a 6% buffer, sending approximately <strong>₹106 worth of USDT</strong>. When you sell this USDT on an Indian exchange, you receive the full ₹100+ net credit directly into your Indian bank account without out-of-pocket losses.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">04.</span>
              <span>Failed Payouts & Automated Wallet Refunds</span>
            </h2>
            <p>
              In the rare event that NOWPayments or the Polygon network encounters a failure, rejection, or timeout during payout processing:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs font-mono">
              <li>Our webhook listeners immediately detect the failed status.</li>
              <li>The full INR amount deducted for the withdrawal is automatically refunded back to your web wallet balance.</li>
              <li>The account withdrawal lock is released, allowing you to re-attempt the withdrawal or update your wallet address.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">05.</span>
              <span>Blockchain Finality & Irreversibility</span>
            </h2>
            <p>
              Cryptocurrency transactions dispatched on the Polygon network are permanent and immutable. Once a payout transaction hash (<code>txHash</code>) is generated and confirmed on PolygonScan, the transaction cannot be reversed, recalled, or modified by EarnReward. Users bear full responsibility for supplying an accurate, EVM-compatible Polygon wallet address.
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
            <Link href="/terms" className="hover:text-blue-600">Terms of Service</Link>
            <span>•</span>
            <Link href="/grievance" className="hover:text-blue-600">Grievance Redressal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
