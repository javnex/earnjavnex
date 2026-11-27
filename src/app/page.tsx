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
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "EarnReward",
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    description:
      "Micro-task platform for Indian users to complete verified tasks, earn ₹10 per task, pool balances across secondary accounts with zero fees, and cash out ₹100 directly to Indian bank accounts.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    provider: {
      "@type": "Organization",
      name: "EarnReward",
      url: "https://earn.javnex.in",
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
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-blue-500/[0.08] via-indigo-500/[0.04] to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Navbar with Desktop Nav Links */}
      <header className="border-b border-slate-200/90 bg-white/90 backdrop-blur-xl sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="EarnReward Homepage">
            <img
              src="/logo.png"
              alt="EarnReward Logo"
              className="h-10 w-10 object-contain rounded-xl shadow-xs transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-black tracking-tight text-slate-900">
              Earn<span className="text-blue-600">Reward</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
              How It Works
            </a>
            <a href="#payouts" className="hover:text-blue-600 transition-colors">
              Payouts & Pooling
            </a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">
              FAQ
            </a>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">
              DPDP Compliance
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex items-center px-4 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors"
            >
              Sign In
            </Link>
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
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-7">
            
            {/* Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 text-xs font-bold text-blue-800 shadow-xs backdrop-blur-md mx-auto">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
              <span>Micro-Task Platform for Indian Users</span>
              <span className="text-blue-300">•</span>
              <span className="text-emerald-700 font-extrabold">₹10 INR / Verified Task</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
              Earn ₹100+{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                Completing Simple Tasks
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl font-bold text-slate-700 max-w-2xl mx-auto">
              ~2 Mins Per Task · Repeat Across Available Tasks · Fast ₹100 Payouts
            </p>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Quick one-time setup, then earn ₹10 per verified task and cash out once your wallet hits ₹100 with zero bank delays.
            </p>

            {/* Hero Feature Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-white text-xs font-bold text-blue-800 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>~2 Min Tasks</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-white text-xs font-bold text-emerald-800 shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>10 Tasks = ₹100 Payout</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-bold text-indigo-800 shadow-xs">
                <Zap className="h-3.5 w-3.5 text-indigo-600" />
                <span>Instant Wallet Credit</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs">
                <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" />
                <span>₹0 Fee P2P Pooling</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link
                href="/auth/login"
                className="btn-futuristic w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/25 transition-all cursor-pointer"
              >
                <span>Get Started Now</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#how-it-works"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 shadow-xs transition-all"
              >
                <span>How It Works</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </a>
            </div>

            {/* Trust Footer line */}
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 font-medium pt-2">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> DPDP Act 2023 Compliant
              </span>
              <span>•</span>
              <span>100% Automated Fast Payouts</span>
            </div>

            {/* Key Trust Metrics Cards across full width */}
            <div className="pt-12 sm:pt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left" id="payouts">
              <div className="glare-card rounded-2xl p-5 sm:p-6 space-y-1.5 bg-white border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Reward Per Task
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums">₹10.00</div>
                <p className="text-xs text-slate-400">Credited instantly upon task verification</p>
              </div>

              <div className="glare-card rounded-2xl p-5 sm:p-6 space-y-1.5 bg-white border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Minimum Payout
                </span>
                <div className="text-2xl sm:text-3xl font-black text-blue-600 tabular-nums">₹100 INR</div>
                <p className="text-xs text-slate-400">Only 10 verified tasks completed</p>
              </div>

              <div className="glare-card rounded-2xl p-5 sm:p-6 space-y-1.5 bg-white border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Internal Transfer Fee
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">₹0.00 Free</div>
                <p className="text-xs text-slate-400">Pool balance across multiple accounts</p>
              </div>

              <div className="glare-card rounded-2xl p-5 sm:p-6 space-y-1.5 bg-white border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Guaranteed Cashout
                </span>
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 tabular-nums">₹100+ Net</div>
                <p className="text-xs text-emerald-600 font-semibold">+14% fee buffer included</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Pillars Section */}
        <section className="border-t border-slate-200/80 bg-white py-20 relative" id="how-it-works">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Simple 3-Step Process
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                How EarnReward Operates
              </h2>
              <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
                High-credibility micro-task architecture engineered for Indian users.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Card 1 */}
              <div className="glare-card rounded-3xl p-7 space-y-4 bg-white border border-slate-200 hover:border-blue-300">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-black text-lg">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900">Complete Available Tasks</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-sans">
                  Open active task listings, complete the simple instruction, and submit your proof. Once verified, ₹10 is credited immediately to your web wallet. Tasks auto-close when the quota is reached.
                </p>
              </div>

              {/* Card 2 */}
              <div className="glare-card rounded-3xl p-7 space-y-4 bg-white border border-slate-200 hover:border-blue-300">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-black text-lg">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900">Pool Across Accounts (₹0 Fee)</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-sans">
                  Strict policy permits 1 submission per task per account. If you own multiple accounts, complete the task on each and transfer your ₹10 earnings to your primary account with zero fees.
                </p>
              </div>

              {/* Card 3 */}
              <div className="glare-card rounded-3xl p-7 space-y-4 bg-white border border-slate-200 hover:border-emerald-300">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-black text-lg">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900">Fast ₹100 Withdraw to Bank</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-sans">
                  Once your wallet hits ₹100, withdraw easily with guaranteed ₹100+ net credit directly into your Indian bank account. Enjoy 100% automated payouts with zero payment gateway blocks or delays.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 border-t border-slate-200/80 bg-slate-50" id="faq">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Got Questions?
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 text-center">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="glare-card rounded-2xl p-6 space-y-2 bg-white border border-slate-200">
                <h3 className="text-base font-bold text-blue-900">
                  How do I withdraw my earnings to my bank account?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Once your web wallet balance reaches ₹100, open the Withdraw tab. We guide you through a simple cashout process that deposits directly into your Indian bank account (via CoinDCX / IMPS) with guaranteed ₹100+ net in your hands.
                </p>
              </div>

              <div className="glare-card rounded-2xl p-6 space-y-2 bg-white border border-slate-200">
                <h3 className="text-base font-bold text-blue-900">
                  How much can I earn per task?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  You earn ₹10 INR for every verified task. With just 10 completed tasks, you reach the ₹100 withdrawal threshold.
                </p>
              </div>

              <div className="glare-card rounded-2xl p-6 space-y-2 bg-white border border-slate-200">
                <h3 className="text-base font-bold text-blue-900">
                  Can I use multiple accounts to pool earnings?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Yes! Each account can complete each task once. You can use multiple accounts and use our ₹0-fee internal wallet transfer to pool all earnings into your main account to reach the ₹100 withdrawal limit quickly.
                </p>
              </div>

              <div className="glare-card rounded-2xl p-6 space-y-2 bg-white border border-slate-200">
                <h3 className="text-base font-bold text-blue-900">
                  Are there any deductions when cashing out?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  No deductions! We include an extra cash-out bonus buffer so that after any standard bank or exchange processing, you receive a full ₹100+ net in your Indian bank account.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Categorized Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-14 text-xs text-slate-600 font-sans shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {/* Col 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="EarnReward Logo"
                  className="h-8 w-8 object-contain rounded-lg shadow-xs"
                />
                <span className="font-bold text-slate-900 tracking-tight text-sm">
                  Earn<span className="text-blue-600">Reward</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Micro-task platform providing Indian users with verified task rewards, zero-fee pooling transfers, and fast ₹100 bank withdrawals.
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
                    Available Tasks
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
                    Email: info@javnex.in
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
            <p>© 2026 EarnReward. All rights reserved.</p>
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
