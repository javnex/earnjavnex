import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, FileText, UserCheck, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Notice - EarnReward | India DPDP Act 2023 Compliant",
  description:
    "Official Privacy Notice under India's Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025 detailing data processing, retention, user rights, and grievance redressal.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white relative">
      {/* Ambient Top Light Blue Specular Glare */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-blue-500/[0.08] via-indigo-500/[0.03] to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="border-b border-slate-200/90 bg-white/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-mono text-slate-600 hover:text-blue-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Platform</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              DPDP Act 2023 Compliant
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10" id="main-content">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-mono font-bold text-blue-800 backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Statutory Privacy Notice (DPDP Act, 2023 & DPDP Rules, 2025)</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
            Privacy Policy & Data Notice
          </h1>
          <p className="text-xs font-mono text-slate-500">
            Last Updated: November 2026 • Effective Date: November 2026 • Version 1.2
          </p>
        </div>

        {/* Section Cards */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
          {/* Section 1 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">01.</span>
              <span>Data Fiduciary Identity & Overview</span>
            </h2>
            <p>
              This Privacy Notice is issued by <strong>EarnReward</strong> (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;Data Fiduciary&quot;) in compliance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> and the <strong>Digital Personal Data Protection Rules, 2025</strong> enacted by the Government of India.
            </p>
            <p>
              We operate an audited micro-task web terminal enabling registered users (&quot;Data Principals&quot;) to complete verified online shop reviews, accumulate reward credits in an internal web wallet, transfer balances between accounts, and receive automated cryptocurrency disbursements in Tether (Polygon USDT).
            </p>
          </section>

          {/* Section 2 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">02.</span>
              <span>Categories of Digital Personal Data Collected</span>
            </h2>
            <p>
              Under the principle of <em>Data Minimization</em>, we collect strictly the personal data necessary to provide and secure micro-task attribution, wallet ledger accounting, and payout execution:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 font-mono text-xs">
              <li><strong className="text-slate-900">Account Identification:</strong> Full Name, Email Address, and Avatar URL provided during Single Sign-On authentication.</li>
              <li><strong className="text-slate-900">Internal Identifier:</strong> Unique alphanumeric user code (e.g. <code>USR-XXXXX</code>) used to protect your private email address during P2P transfers.</li>
              <li><strong className="text-slate-900">Task Verification Data:</strong> Public store review proof URL submitted by you, review timestamp, and assigned task reference.</li>
              <li><strong className="text-slate-900">Financial Disbursement Data:</strong> Public Polygon (EVM) wallet address provided by you for USDT withdrawal dispatches.</li>
              <li><strong className="text-slate-900">Security & Audit Logs:</strong> Cryptographic payout hashes, IP address, user-agent, and transaction timestamps strictly for fraud detection and anti-sybil enforcement.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">03.</span>
              <span>Specified Lawful Grounds & Purposes of Processing</span>
            </h2>
            <p>
              In accordance with Section 6 of the DPDP Act, your personal data is processed solely on the basis of your <strong>free, specific, informed, unconditional, and unambiguous affirmative consent</strong>, as well as for certain legitimate uses:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs font-mono">
              <li>Authenticating your account securely via OAuth 2.0 without storing plaintext passwords.</li>
              <li>Verifying task submissions against shop task limits and organic rating balance distributions.</li>
              <li>Crediting ₹10 INR task rewards and maintaining an unalterable wallet ledger.</li>
              <li>Facilitating zero-fee peer-to-peer transfers between accounts.</li>
              <li>Executing automated blockchain withdrawals via NOWPayments Polygon POS network.</li>
              <li>Preventing automated bot abuse, link tampering, and duplicate review exploitation.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">04.</span>
              <span>Third-Party Data Processors & Service Providers</span>
            </h2>
            <p>
              We do not sell, rent, or trade your personal data. We engage contracted Data Processors solely to facilitate platform hosting, identity verification, and payout settlement:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
              <div className="glass-panel p-3.5 rounded-xl space-y-1 bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block">Google LLC</span>
                <span className="text-slate-600">OAuth 2.0 authentication and profile verification.</span>
              </div>
              <div className="glass-panel p-3.5 rounded-xl space-y-1 bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block">Supabase Inc.</span>
                <span className="text-slate-600">Managed PostgreSQL database with TLS 1.3 encryption at rest and in transit.</span>
              </div>
              <div className="glass-panel p-3.5 rounded-xl space-y-1 bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block">NOWPayments</span>
                <span className="text-slate-600">Cryptocurrency payment gateway for automated Polygon USDT dispatches.</span>
              </div>
              <div className="glass-panel p-3.5 rounded-xl space-y-1 bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block">Polygon Public Blockchain</span>
                <span className="text-slate-600">Public distributed ledger for transparent, irreversible payout verification.</span>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">05.</span>
              <span>Data Retention & Minimization Schedule</span>
            </h2>
            <p>
              We retain personal data only for as long as necessary to fulfill the specified purpose for which it was collected, or as required by applicable tax, accounting, or anti-fraud laws:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs font-mono">
              <li><strong className="text-slate-900">Active Accounts:</strong> User profile and wallet ledger data are retained for the duration of active service.</li>
              <li><strong className="text-slate-900">Task Submissions:</strong> Review URLs are retained for verification and quota balancing audit records.</li>
              <li><strong className="text-slate-900">Account Deletion:</strong> Upon an approved erasure request, personal identifiers are purged or irreversibly anonymized within 72 hours, subject to statutory retention obligations.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">06.</span>
              <span>Statutory Rights of Data Principals</span>
            </h2>
            <p>
              Under Chapter III of the DPDP Act, you have enforceable legal rights regarding your digital personal data:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 text-xs">
              <li><strong className="text-slate-900 font-mono">Right to Access Information (Section 11):</strong> You may request a summary of the personal data being processed and the processing activities undertaken via our automated Data Export API.</li>
              <li><strong className="text-slate-900 font-mono">Right to Correction and Erasure (Section 12):</strong> You have the right to correct inaccurate data, complete incomplete data, or request permanent account deletion and erasure of personal data.</li>
              <li><strong className="text-slate-900 font-mono">Right of Grievance Redressal (Section 13):</strong> You may file a formal complaint with our designated Grievance Officer regarding any act or omission by the Data Fiduciary.</li>
              <li><strong className="text-slate-900 font-mono">Right to Nominate (Section 14):</strong> You have the right to nominate any other individual who shall, in the event of death or incapacity, exercise your rights as a Data Principal.</li>
              <li><strong className="text-slate-900 font-mono">Right to Withdraw Consent:</strong> You may withdraw your consent at any time through account deletion or by notifying our Grievance Officer.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-3 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">07.</span>
              <span>Protection of Children&apos;s Data</span>
            </h2>
            <p>
              EarnReward is strictly designed and intended for individuals aged <strong>18 years or older</strong> who possess legal capacity to enter into agreements and manage digital asset transactions. We do not knowingly collect, process, or track digital personal data belonging to children or minors under 18 years of age. Accounts identified as belonging to minors will be closed and their data erased immediately.
            </p>
          </section>

          {/* Section 8 */}
          <section className="glare-card rounded-2xl p-6 sm:p-7 space-y-4 bg-white border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
              <span className="text-blue-600 font-bold">08.</span>
              <span>Grievance Officer & Statutory Redressal Mechanism</span>
            </h2>
            <p>
              In compliance with Section 13 of the DPDP Act and the DPDP Rules, 2025, EarnReward has appointed a designated Grievance Officer:
            </p>
            <div className="glass-panel p-4 rounded-xl space-y-1.5 font-mono text-xs bg-slate-50 border border-slate-200">
              <div className="text-slate-900 font-bold">Designated Grievance Officer: Legal & Data Protection Desk</div>
              <div className="text-slate-600">Entity: EarnReward Platform</div>
              <div className="text-slate-600">Email: <a href="mailto:grievance@EarnReward.in" className="text-blue-600 underline font-bold">grievance@EarnReward.in</a></div>
              <div className="text-slate-600">Jurisdiction: India</div>
              <div className="text-slate-600">Statutory Response Window: Acknowledgment within 48 hours; resolution within prescribed DPDP timelines.</div>
            </div>
            <div className="pt-2">
              <Link
                href="/grievance"
                className="btn-futuristic inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-white shadow-md shadow-blue-500/20"
              >
                <span>Submit a Formal Grievance or Request</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 font-mono mt-16">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p>© 2026 EarnReward. All rights reserved. India DPDP Act 2023 Compliant.</p>
          <div className="flex justify-center gap-4 text-slate-500">
            <Link href="/terms" className="hover:text-blue-600">Terms of Service</Link>
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
