import Navbar from "@/components/Navbar";
import DashboardAuthGuard from "@/components/DashboardAuthGuard";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | EarnReward",
  },
  description:
    "Manage your micro-tasks, wallet balance, zero-fee internal transfers, and fast bank withdrawals on EarnReward.",
  alternates: {
    canonical: "/dashboard",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-12 relative selection:bg-blue-600 selection:text-white">
      <DashboardAuthGuard />
      {/* Subtle Ambient Blue Trust Light */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-blue-500/[0.06] via-indigo-500/[0.02] to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />
      <Navbar />
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
