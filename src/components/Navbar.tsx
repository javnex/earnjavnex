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
    { href: "/dashboard/withdraw", label: "Instant Cashout", icon: Wallet },
    { href: "/dashboard/history", label: "Ledger", icon: History },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 shadow-md shadow-emerald-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                Review<span className="text-emerald-400">Reward</span>
              </span>
              <span className="ml-1.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                ₹10/Task
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          {session && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-slate-800 text-emerald-400 border border-emerald-500/20"
                        : "text-slate-300 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
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
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-300 transition-colors"
                  >
                    <span>ID: {userCode}</span>
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-400" />
                    )}
                  </button>
                )}

                {/* Wallet Balance Badge */}
                <Link
                  href="/dashboard/withdraw"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/30 text-emerald-300 font-medium text-sm transition-all shadow-sm shadow-emerald-950"
                >
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-white">₹{walletBalance.toFixed(0)}</span>
                  <span className="hidden sm:inline text-xs text-emerald-400/80">
                    USDT
                  </span>
                </Link>

                {/* Admin Portal link */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-950/50 hover:bg-violet-900/40 text-xs font-semibold text-violet-300 transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
                    Admin
                  </Link>
                )}

                {/* Sign Out */}
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  title="Sign out"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>

                {/* Mobile hamburger menu button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-slate-400 hover:text-white"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium text-sm shadow-md shadow-emerald-500/20 transition-all"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && session && (
          <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 py-3 space-y-2">
            {userCode && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono text-slate-400">
                <span>My ID: {userCode}</span>
                <button
                  onClick={copyUserCode}
                  className="flex items-center gap-1 text-emerald-400 hover:underline"
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? "bg-slate-800 text-emerald-400"
                      : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-violet-300 bg-violet-950/40"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Portal
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      {session && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-lg px-2 py-1.5 flex justify-around">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
                  isActive ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-emerald-400" : ""}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
