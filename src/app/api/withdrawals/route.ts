import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { executeNowpaymentsPayout, getLiveUsdtInrRate } from "@/lib/nowpayments";
import { z } from "zod";

const withdrawalSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 42-character Polygon (EVM) wallet address"),
  amountInr: z.number().positive().optional(),
});

// GET /api/withdrawals - List withdrawals
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";

    if (all && userRole === "ADMIN") {
      const withdrawals = await prisma.withdrawal.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true, userCode: true } },
        },
        take: 100,
      });
      return NextResponse.json({ withdrawals });
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ withdrawals });
  } catch (error: any) {
    console.error("GET /api/withdrawals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch withdrawals" },
      { status: 500 }
    );
  }
}

// POST /api/withdrawals - Request automated USDT payout
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const parsed = withdrawalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { walletAddress } = parsed.data;

    // 1. Fetch current settings
    const setting =
      (await prisma.setting.findUnique({ where: { id: "default" } })) || {
        minWithdrawalInr: 100.0,
        cashoutBufferPercent: 6.0,
        usdtInrRate: 90.5,
      };

    const minAmount = setting.minWithdrawalInr;
    const bufferPercent = setting.cashoutBufferPercent;

    // 2. Fetch live USDT rate
    const usdtRate = await getLiveUsdtInrRate(setting.usdtInrRate);

    // 3. Atomically check balance and reserve withdrawal
    const withdrawalRecord = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.isWithdrawing) {
        throw new Error(
          "A withdrawal is already currently in progress for your account. Please wait."
        );
      }

      const withdrawAmount = parsed.data.amountInr || user.walletBalance;

      if (withdrawAmount < minAmount) {
        throw new Error(
          `Minimum withdrawal amount is ₹${minAmount}. Your current balance is ₹${user.walletBalance.toFixed(
            2
          )}.`
        );
      }

      if (user.walletBalance < withdrawAmount) {
        throw new Error(
          `Insufficient balance. You requested ₹${withdrawAmount}, but have ₹${user.walletBalance.toFixed(
            2
          )}.`
        );
      }

      // Calculate 6% buffer: e.g. ₹100 becomes ₹106 worth of USDT
      const bufferedInr = Number(
        (withdrawAmount * (1 + bufferPercent / 100)).toFixed(2)
      );
      const usdtAmount = Number((bufferedInr / usdtRate).toFixed(4));

      // Lock user and deduct balance
      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { decrement: withdrawAmount },
          isWithdrawing: true,
        },
      });

      // Create withdrawal record with status PROCESSING
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          amountInr: withdrawAmount,
          bufferedInr,
          usdtAmount,
          network: "POLYGON",
          walletAddress,
          status: "PROCESSING",
        },
      });

      return { withdrawal, withdrawAmount, bufferedInr, usdtAmount };
    });

    // 4. Trigger NOWPayments automated payout
    const payoutResult = await executeNowpaymentsPayout({
      withdrawalId: withdrawalRecord.withdrawal.id,
      walletAddress,
      usdtAmount: withdrawalRecord.usdtAmount,
    });

    if (!payoutResult.success) {
      // Automatic Rollback: Refund user's balance and mark withdrawal as FAILED
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            walletBalance: { increment: withdrawalRecord.withdrawAmount },
            isWithdrawing: false,
          },
        }),
        prisma.withdrawal.update({
          where: { id: withdrawalRecord.withdrawal.id },
          data: {
            status: "FAILED",
            errorMessage: payoutResult.error || "Payout gateway error",
          },
        }),
      ]);

      return NextResponse.json(
        {
          error: `Payout execution failed: ${payoutResult.error}. Your balance has been fully refunded.`,
        },
        { status: 502 }
      );
    }

    // Payout initiated successfully! Update record
    const finalStatus = payoutResult.simulated ? "FINISHED" : "PROCESSING";

    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: withdrawalRecord.withdrawal.id },
      data: {
        nowpaymentsPayoutId: payoutResult.payoutId || null,
        batchWithdrawalId: payoutResult.batchId || null,
        txHash: payoutResult.txHash || null,
        status: finalStatus,
      },
    });

    // Unlock user withdrawing flag
    await prisma.user.update({
      where: { id: userId },
      data: { isWithdrawing: false },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Payout initiated! Sent ${withdrawalRecord.usdtAmount} USDT (Polygon) to ${walletAddress}.`,
        withdrawal: updatedWithdrawal,
        bufferedInr: withdrawalRecord.bufferedInr,
        simulated: payoutResult.simulated,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/withdrawals error:", error.message);
    return NextResponse.json(
      { error: error.message || "Withdrawal failed" },
      { status: 400 }
    );
  }
}
