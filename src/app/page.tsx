import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  ArrowRightLeft,
  CheckCircle2,
  Wallet,
  TrendingUp,
  Building,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 shadow-md shadow-emerald-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Review<span className="text-emerald-400">Reward</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2"
            >
              Log In
            </Link>
            <Link
              href="/auth/login"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
          {/* Radial Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-[700px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3.5 py-1 text-xs font-semibold text-emerald-300 shadow-inner">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Micro-Task Platform for Indian Users</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400">₹10 INR / Verified Review</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Review Online Shops.{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Earn ₹10 Per Task.
              </span>{" "}
              Instant USDT Payouts.
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Log in with Google, review listed businesses, and earn ₹10 into your web wallet. Pool multiple Google accounts via <strong>₹0-fee internal transfers</strong>, and withdraw directly to Polygon USDT with our <strong>6% Indian bank cash-out buffer</strong>.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Link
                href="/auth/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-500/25 transition-all"
              >
                <span>Start Earning with Google</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/login"
                className="w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 px-6 py-3.5 text-sm font-semibold text-slate-300 transition-colors"
              >
                Sign In to Dashboard
              </Link>
            </div>

            {/* Key Trust Metrics */}
            <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-1">
                <span className="text-xs font-semibold text-slate-400">
                  Reward Per Review
                </span>
                <div className="text-2xl font-black text-emerald-400">₹10.00</div>
                <p className="text-[11px] text-slate-500">Credited instantly</p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-1">
                <span className="text-xs font-semibold text-slate-400">
                  Minimum Payout
                </span>
                <div className="text-2xl font-black text-white">₹100 INR</div>
                <p className="text-[11px] text-slate-500">Only 10 verified tasks</p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-1">
                <span className="text-xs font-semibold text-slate-400">
                  Internal Transfer Fee
                </span>
                <div className="text-2xl font-black text-cyan-400">₹0.00 Free</div>
                <p className="text-[11px] text-slate-500">Pool multi-accounts</p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-1">
                <span className="text-xs font-semibold text-slate-400">
                  Payout Rail
                </span>
                <div className="text-2xl font-black text-purple-400">Polygon USDT</div>
                <p className="text-[11px] text-slate-500">+6% bank cashout buffer</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Pillars Section */}
        <section className="border-t border-slate-800/80 bg-slate-900/30 py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                How ReviewReward Works
              </h2>
              <p className="text-sm text-slate-400 max-w-xl mx-auto">
                Designed specifically for Indian freelancers, students, and micro-taskers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">1. Complete Shop Reviews</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Open active shop links, post an authentic review, and submit your link. Once verified, ₹10 is credited immediately to your web wallet. Tasks auto-close when the review limit is reached.
                </p>
              </div>

              {/* Card 2 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">2. Pool Across Accounts (₹0 Fee)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Strict policy permits 1 review per shop per Google account. If you own 5 or 10 Google IDs, complete the review on each and transfer your ₹10 earnings to your primary ID with zero fees.
                </p>
              </div>

              {/* Card 3 */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">3. Guaranteed ₹100 Bank Cash-Out</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Withdraw in Polygon USDT directly to CoinDCX, Mudrex, or CoinSwitch. We automatically add a 6% buffer (~₹106 worth of USDT) to cover Indian exchange spreads and 1% TDS.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <h2 className="text-2xl font-extrabold text-white text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
                <h3 className="text-sm font-bold text-white">
                  Why do you pay in Polygon USDT instead of UPI?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Traditional payment gateways (Razorpay, Paytm) and Indian banks frequently freeze accounts for high-frequency ₹100 micro-transactions. Cryptocurrency on the Polygon network guarantees 24x7 instant payouts without account freezes, zero delays, and near-zero network fees (~₹0.20).
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
                <h3 className="text-sm font-bold text-white">
                  Which crypto apps can I use to withdraw to my Indian bank?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You can use any Indian crypto app such as <strong>CoinDCX, Mudrex, CoinSwitch</strong>, or international wallets like <strong>Trust Wallet or MetaMask</strong>. Simply copy your USDT (Polygon/MATIC network) deposit address, paste it on the Withdraw page, and sell the USDT inside your app to withdraw INR directly to your bank account.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
                <h3 className="text-sm font-bold text-white">
                  What is the 6% cash-out buffer?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  When selling USDT for INR on Indian exchanges, users incur a 1% TDS and exchange spreads. To ensure you receive a full ₹100+ in your bank account, we automatically add a 6% bonus (sending ₹106 worth of USDT) on every ₹100 withdrawal.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© 2026 ReviewReward. Micro-Task & Rewards Platform with Instant USDT Payouts.</p>
          <p className="text-slate-600">
            Powered by NOWPayments Mass Payouts API & Supabase PostgreSQL.
          </p>
        </div>
      </footer>
    </div>
  );
}
