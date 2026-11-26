import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getNowpaymentsBalance } from "@/lib/nowpayments";

// GET /api/admin/stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = (session?.user as any)?.email;
    if (!session || (session.user as any)?.role !== "ADMIN" || !isAdminEmail(email)) {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    try {
      const supabase = getSupabaseAdmin();
      const [
        { count: activeTasksCount },
        { count: closedTasksCount },
        { count: verifiedSubmissionsCount },
        { count: pendingSubmissionsCount },
        { data: allUsers },
        { data: allWithdrawals },
      ] = await Promise.all([
        supabase.from("Task").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
        supabase.from("Task").select("*", { count: "exact", head: true }).eq("status", "CLOSED"),
        supabase.from("Submission").select("*", { count: "exact", head: true }).eq("status", "APPROVED"),
        supabase.from("Submission").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("User").select("walletBalance"),
        supabase.from("Withdrawal").select("usdtAmount, amountInr, status"),
      ]);

      const totalUserWalletBalanceInr = (allUsers || []).reduce(
        (sum, u) => sum + (u.walletBalance || 0),
        0
      );
      const finishedWithdrawals = (allWithdrawals || []).filter((w) => w.status === "FINISHED");
      const totalWithdrawnUsdt = finishedWithdrawals.reduce(
        (sum, w) => sum + (w.usdtAmount || 0),
        0
      );
      const totalWithdrawnInr = finishedWithdrawals.reduce(
        (sum, w) => sum + (w.amountInr || 0),
        0
      );

      const nowpayments = await getNowpaymentsBalance();

      return NextResponse.json({
        stats: {
          activeTasks: activeTasksCount || 0,
          closedTasks: closedTasksCount || 0,
          totalTasks: (activeTasksCount || 0) + (closedTasksCount || 0),
          verifiedSubmissions: verifiedSubmissionsCount || 0,
          pendingSubmissions: pendingSubmissionsCount || 0,
          totalUsers: (allUsers || []).length,
          totalUserWalletBalanceInr,
          totalWithdrawnUsdt,
          totalWithdrawnInr,
          completedWithdrawalsCount: finishedWithdrawals.length,
          nowpaymentsCustodyUsdt: Number(
            (
              (nowpayments.balances?.usdtmatic?.amount ?? 0) +
              (nowpayments.balances?.usdtbsc?.amount ?? 0)
            ).toFixed(4)
          ),
        },
      });
    } catch (supaErr) {
      console.warn("Supabase stats fallback to prisma:", supaErr);
    }

    const [
      activeTasksCount,
      closedTasksCount,
      verifiedSubmissionsCount,
      pendingSubmissionsCount,
      usersAgg,
      withdrawalsAgg,
    ] = await Promise.all([
      prisma.task.count({ where: { status: "ACTIVE" } }),
      prisma.task.count({ where: { status: "CLOSED" } }),
      prisma.submission.count({ where: { status: "APPROVED" } }),
      prisma.submission.count({ where: { status: "PENDING" } }),
      prisma.user.aggregate({
        _sum: { walletBalance: true },
        _count: { id: true },
      }),
      prisma.withdrawal.aggregate({
        where: { status: "FINISHED" },
        _sum: { usdtAmount: true, amountInr: true },
        _count: { id: true },
      }),
    ]);

    // Live NOWPayments Custody Balance
    const nowpayments = await getNowpaymentsBalance();

    return NextResponse.json({
      stats: {
        activeTasks: activeTasksCount,
        closedTasks: closedTasksCount,
        totalTasks: activeTasksCount + closedTasksCount,
        verifiedSubmissions: verifiedSubmissionsCount,
        pendingSubmissions: pendingSubmissionsCount,
        totalUsers: usersAgg._count.id || 0,
        totalUserWalletBalanceInr: usersAgg._sum.walletBalance || 0,
        totalWithdrawnUsdt: withdrawalsAgg._sum.usdtAmount || 0,
        totalWithdrawnInr: withdrawalsAgg._sum.amountInr || 0,
        completedWithdrawalsCount: withdrawalsAgg._count.id || 0,
        nowpaymentsCustodyUsdt:
          nowpayments.balances?.usdtmatic?.amount ?? 0.0,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/stats error:", error);
    return NextResponse.json(
      { error: "Failed to load admin stats" },
      { status: 500 }
    );
  }
}
