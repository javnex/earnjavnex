import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getNowpaymentsBalance } from "@/lib/nowpayments";

// GET /api/admin/stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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
          nowpayments.balances?.usdtmatic?.amount ?? 1250.0,
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
