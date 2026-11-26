import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  LayoutDashboard,
  ListTodo,
  CheckSquare,
  ArrowRightLeft,
  Settings,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const email = (session?.user as any)?.email;

  if (
    !session ||
    (session.user as any)?.role !== "ADMIN" ||
    !isAdminEmail(email)
  ) {
    redirect("/dashboard");
  }

  const adminLinks = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/tasks", label: "Manage Tasks", icon: ListTodo },
    { href: "/admin/submissions", label: "Verification Queue", icon: CheckSquare },
    { href: "/admin/payouts", label: "Transfers & Payouts", icon: ArrowRightLeft },
    { href: "/admin/settings", label: "System Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/60 p-5 space-y-6 shrink-0">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-md shadow-violet-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">
                Admin<span className="text-violet-400">Portal</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-mono">
                ReviewReward Control
              </span>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="md:hidden text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>App</span>
          </Link>
        </div>

        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Icon className="h-4 w-4 text-violet-400 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block pt-6 border-t border-slate-800/80">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to User Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 p-5 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {children}
      </main>
    </div>
  );
}
