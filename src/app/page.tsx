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
  Lock,
  Mail,
  FileText,
  Star,
} from "lucide-react";

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "ReviewReward",
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    description:
      "Micro-task platform for Indian users to review verified shops, earn ₹10 per review, pool balances across Google accounts with zero fees, and cash out ₹100 directly to Indian bank accounts.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    provider: {
      "@type": "Organization",
      name: "ReviewReward",
      url: "https://reviewreward.in",
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white relative">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Ambient Top Light Blue Specular Glare */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-blue-500/[0.08] via-indigo-500/[0.04] to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Navbar */}
      <header className="border-b border-slate-200/90 bg-white/90 backdrop-blur-xl sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="ReviewReward Homepage">
            <img
              src="/logo.png"
              alt="ReviewReward Logo"
              className="h-10 w-10 object-contain rounded-xl shadow-xs transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-black tracking-tight text-slate-900">
              Review<span className="text-blue-600">Reward</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="btn-futuristic flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1" id="main-content">
        <section className="relative overflow-hidden pt-14 pb-20 sm:pt-20 sm:pb-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1 text-xs font-bold text-blue-800 shadow-xs backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
              <span>Micro-Task Terminal for Indian Users</span>
              <span className="text-blue-300">•</span>
              <span className="text-emerald-700 font-extrabold">₹10 INR / Verified Review</span>
            </div>

            {/* Official Logo Display with Subtle Glow */}
            <div className="flex justify-center pt-2">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
                <img
                  src="/logo.png"
                  alt="ReviewReward Official Logo"
                  className="relative h-24 w-24 sm:h-28 sm:w-28 object-contain rounded-2xl shadow-lg border border-slate-200/80 bg-white p-2"
                />
              </div>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-tight">
              Earn ₹100+{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                Reviewing Online Shops
              </span>
            </h1>

            <p className="text-lg sm:text-xl font-bold text-slate-700 max-w-2xl mx-auto">
              ~2 Mins Per Task · Repeat Across Live Shops · Fast ₹100 Payouts
            </p>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Quick one-time setup, then earn ₹10 per verified review across available shops and cash out once your wallet hits ₹100.
            </p>

            {/* Hero Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200 bg-white text-xs font-bold text-blue-800 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>~2 Min Tasks</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-200 bg-white text-xs font-bold text-emerald-800 shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>10 Shops = ₹100 Payout</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-bold text-indigo-800 shadow-xs">
                <Zap className="h-3.5 w-3.5 text-indigo-600" />
                <span>Instant Wallet Credit</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center justify-center pt-3">
              <Link
                href="/auth/login"
                className="btn-futuristic w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl px-8 py-3.5 text-xs font-black text-white shadow-xl shadow-blue-500/25 transition-all cursor-pointer"
              >
                <span>Get Started with Google</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Key Trust Metrics Cards */}
            <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="glare-card rounded-2xl p-5 space-y-1 bg-white border border-slate-200">
                <span className="text-xs font-semibold text-slate-500">
                  Reward Per Review
                </span>
                <div className="text-3xl font-black text-emerald-600 tabular-nums">₹10.00</div>
                <p className="text-[11px] text-slate-400">Credited instantly</p>
              </div>

              <div className="glare-card rounded-2xl p-5 space-y-1 bg-white border border-slate-200">
                <span className="text-xs font-semibold text-slate-500">
                  Minimum Payout
                </span>
                <div className="text-3xl font-black text-blue-600 tabular-nums">₹100 INR</div>
                <p className="text-[11px] text-slate-400">Only 10 verified tasks</p>
              </div>

              <div className="glare-card rounded-2xl p-5 space-y-1 bg-white border border-slate-200">
                <span className="text-xs font-semibold text-slate-500">
                  Internal Transfer Fee
                </span>
                <div className="text-3xl font-black text-slate-900 tabular-nums">₹0.00 Free</div>
                <p className="text-[11px] text-slate-400">Pool multi-accounts</p>
              </div>

              <div className="glare-card rounded-2xl p-5 space-y-1 bg-white border border-slate-200">
                <span className="text-xs font-semibold text-slate-500">
                  Guaranteed Withdraw
                </span>
                <div className="text-3xl font-black text-indigo-600 tabular-nums">₹100+ Net</div>
                <p className="text-[11px] text-emerald-600 font-semibold">+14% fee buffer included</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Pillars Section */}
        <section className="border-t border-slate-200/80 bg-white py-20 relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                How ReviewReward Operates
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
                High-credibility micro-task architecture engineered for Indian users.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="glare-card rounded-3xl p-6 space-y-3 bg-white border border-slate-200 hover:border-blue-300">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">1. Complete Shop Reviews</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Open active shop links, post an authentic review with the assigned star rating, and submit your review proof link. Once verified, ₹10 is credited immediately to your web wallet. Tasks auto-close when the quota is reached.
                </p>
              </div>

              {/* Card 2 */}
              <div className="glare-card rounded-3xl p-6 space-y-3 bg-white border border-slate-200 hover:border-blue-300">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">2. Pool Across Accounts (₹0 Fee)</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Strict policy permits 1 review per shop per Google account. If you own multiple legitimate Google IDs, complete the review on each and transfer your ₹10 earnings to your primary account with zero fees.
                </p>
              </div>

              {/* Card 3 */}
              <div className="glare-card rounded-3xl p-6 space-y-3 bg-white border border-slate-200 hover:border-emerald-300">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">3. Fast ₹100 Withdraw to Bank</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Once your wallet hits ₹100, withdraw easily with guaranteed ₹100+ net credit directly into your Indian bank account. Enjoy 100% automated payouts with zero payment gateway blocks or delays.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 border-t border-slate-200/80 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              <div className="glare-card rounded-2xl p-6 space-y-2 bg-white border border-slate-200">
                <h3 className="text-sm font-bold text-blue-900">
                  How do I withdraw my earnings to my bank account?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Once your web wallet balance reaches ₹100, open the Withdraw tab. We guide you through a simple 3-step cashout process that deposits directly into your Indian bank account (via CoinDCX / IMPS) with guaranteed ₹100+ net in your hands.
                </p>
              </div>

              <div className="glare-card rounded-2xl p-6 space-y-2 bg-white border border-slate-200">
                <h3 className="text-sm font-bold text-blue-900">
                  How much can I earn per review?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You earn ₹10 INR for every verified review. With just 10 tasks, you reach the ₹100 withdrawal threshold.
                </p>
              </div>

              <div className="glare-card rounded-2xl p-6 space-y-2 bg-white border border-slate-200">
                <h3 className="text-sm font-bold text-blue-900">
                  Can I use multiple Google accounts to pool earnings?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Yes! Each Google account can review each shop once. You can use multiple Google accounts and use our ₹0-fee internal wallet transfer to pool all earnings into your main account to reach the ₹100 withdrawal limit quickly.
                </p>
              </div>

              <div className="glare-card rounded-2xl p-6 space-y-2 bg-white border border-slate-200">
                <h3 className="text-sm font-bold text-blue-900">
                  Are there any deductions when cashing out?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  No deductions! We include an extra cash-out bonus buffer so that after any standard bank or exchange processing, you receive a full ₹100+ net in your Indian bank account.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Categorized Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-12 text-xs text-slate-600 font-sans shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {/* Col 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="ReviewReward Logo"
                  className="h-8 w-8 object-contain rounded-lg shadow-xs"
                />
                <span className="font-bold text-slate-900 tracking-tight text-sm">
                  Review<span className="text-blue-600">Reward</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Micro-task terminal providing Indian users with verified shop review rewards, zero-fee pooling transfers, and fast ₹100 bank withdrawals.
              </p>
              <div className="text-[11px] font-mono text-slate-400">
                Operated in compliance with India DPDP Act, 2023.
              </div>
            </div>

            {/* Col 2 */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 block">
                Platform
              </span>
              <ul className="space-y-2 text-slate-600 text-xs">
                <li>
                  <Link href="/dashboard/tasks" className="hover:text-blue-600 transition-colors">
                    Shop Review Tasks
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
                    Web Wallet
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/transfer" className="hover:text-blue-600 transition-colors">
                    P2P Multi-Account Pooling
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/withdraw" className="hover:text-blue-600 transition-colors">
                    Fast Withdrawals (₹100 Min)
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/history" className="hover:text-blue-600 transition-colors">
                    Ledger Audit Logs
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 block">
                Legal & Governance
              </span>
              <ul className="space-y-2 text-slate-600 text-xs">
                <li>
                  <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                    Privacy Notice (DPDP 2023)
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-blue-600 transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/refund" className="hover:text-blue-600 transition-colors">
                    Refund & Payout Policy
                  </Link>
                </li>
                <li>
                  <span className="text-slate-400">Strictly 18+ Platform</span>
                </li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 block">
                Grievance Redressal
              </span>
              <ul className="space-y-2 text-slate-600 text-xs">
                <li>
                  <Link href="/grievance" className="hover:text-blue-600 transition-colors">
                    Data Protection Officer Desk
                  </Link>
                </li>
                <li>
                  <Link href="/grievance" className="hover:text-blue-600 transition-colors">
                    File Statutory Grievance
                  </Link>
                </li>
                <li>
                  <span className="text-slate-500 block text-[11px]">
                    Email: grievance@reviewreward.in
                  </span>
                </li>
                <li>
                  <span className="text-slate-500 block text-[11px]">
                    Response Window: 48 Hours
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
            <p>© 2026 ReviewReward. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                Privacy
              </Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-blue-600 transition-colors">
                Terms
              </Link>
              <span>•</span>
              <Link href="/refund" className="hover:text-blue-600 transition-colors">
                Refunds
              </Link>
              <span>•</span>
              <Link href="/grievance" className="hover:text-blue-600 transition-colors">
                Grievance Officer
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
