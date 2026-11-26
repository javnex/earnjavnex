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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row relative selection:bg-blue-600 selection:text-white">
      {/* Ambient Top Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-blue-100/50 via-indigo-50/20 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-white/90 backdrop-blur-2xl p-5 space-y-6 shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="ReviewReward Admin"
              className="h-9 w-9 object-contain drop-shadow-sm transition-transform group-hover:scale-105"
            />
            <div>
              <span className="text-base font-extrabold text-slate-900 tracking-tight">
                Admin<span className="text-blue-600">Portal</span>
              </span>
              <span className="block text-[10px] text-slate-500 font-mono font-semibold">
                Control Terminal
              </span>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="md:hidden text-xs text-slate-600 hover:text-blue-600 flex items-center gap-1 font-mono"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>App</span>
          </Link>
        </div>

        <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 hover:border-blue-200 border border-transparent transition-all whitespace-nowrap"
              >
                <Icon className="h-4 w-4 text-blue-600 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block pt-6 border-t border-slate-200">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-all font-mono"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main id="main-content" className="flex-1 p-3.5 sm:p-8 max-w-7xl mx-auto w-full space-y-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
