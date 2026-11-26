"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import { useState } from "react";
import {
  Wallet,
  ArrowRightLeft,
  CheckCircle2,
  ListTodo,
  ShieldCheck,
  LogOut,
  Copy,
  Check,
  Menu,
  X,
  History,
  Sparkles,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = session?.user as any;
  const walletBalance = user?.walletBalance ?? 0;
  const userCode = user?.userCode;
  const isAdmin = user?.role === "ADMIN";

  const copyUserCode = () => {
    if (!userCode) return;
    navigator.clipboard.writeText(userCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navLinks = [
    { href: "/dashboard/tasks", label: "Tasks", icon: ListTodo },
    { href: "/dashboard/transfer", label: "P2P Transfer", icon: ArrowRightLeft },
    { href: "/dashboard/withdraw", label: "Instant Withdraw", icon: Wallet },
    { href: "/dashboard/history", label: "Ledger", icon: History },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/90 bg-white/90 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo with Official Uploaded Image */}
          <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
            <img
              src="/logo.png"
              alt="ReviewReward"
              className="h-9 w-9 sm:h-10 sm:w-10 object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              Review<span className="text-blue-600">Reward</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          {session && (
            <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl border border-slate-200/80 bg-slate-50/80">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                        : "text-slate-600 hover:text-blue-600 hover:bg-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Header: Wallet, User Code & Auth */}
          <div className="flex items-center gap-2.5">
            {session ? (
              <>
                {/* User Code Click-to-Copy */}
                {userCode && (
                  <button
                    onClick={copyUserCode}
                    title="Click to copy your User ID for receiving internal transfers"
                    aria-label="Copy User ID to clipboard"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-mono text-slate-700 transition-all cursor-pointer shadow-xs"
                  >
                    <span className="text-slate-400">ID:</span>
                    <span className="text-slate-900 font-bold">{userCode}</span>
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-400" />
                    )}
                  </button>
                )}

                {/* Wallet Balance Badge (Green Accent) */}
                <Link
                  href="/dashboard/withdraw"
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium text-xs transition-all shadow-xs"
                >
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                  <span className="font-black text-emerald-800 text-sm tabular-nums">
                    ₹{walletBalance.toFixed(0)}
                  </span>
                  <span className="hidden sm:inline text-[11px] text-emerald-600 font-bold">
                    INR
                  </span>
                </Link>

                {/* Admin Portal link */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-all shadow-xs"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>Admin</span>
                  </Link>
                )}

                {/* Sign Out */}
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  title="Sign out"
                  aria-label="Sign out of your account"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>

                {/* Mobile hamburger menu button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={mobileMenuOpen}
                  className="md:hidden p-2 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="btn-futuristic flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && session && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-2 shadow-lg">
            {userCode && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-mono text-slate-600">
                <span>My ID: {userCode}</span>
                <button
                  onClick={copyUserCode}
                  className="flex items-center gap-1 text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  {copied ? "Copied!" : "Copy ID"}
                </button>
              </div>
            )}
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                    isActive
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Admin Portal</span>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      {session && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-xl px-2 py-1.5 flex justify-around shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-all ${
                  isActive
                    ? "text-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? "text-blue-600" : ""}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
