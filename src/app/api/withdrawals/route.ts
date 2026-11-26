import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import { executeNowpaymentsPayout, getLiveUsdtInrRate } from "@/lib/nowpayments";
import { sendWithdrawalInitiatedEmail } from "@/lib/email";
import { z } from "zod";

const withdrawalSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 42-character EVM wallet address (CoinDCX BSC or Polygon)"),
  amountInr: z.number().positive().optional(),
  network: z.enum(["BSC", "POLYGON"]).optional().default("BSC"),
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
    const userEmail = (session.user as any).email;
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";

    try {
      const supabase = getSupabaseAdmin();
      if (all && userRole === "ADMIN" && isAdminEmail(userEmail)) {
        const { data: supaW, error: wErr } = await supabase
          .from("Withdrawal")
          .select("*, user:User(name, email, userCode)")
          .order("createdAt", { ascending: false })
          .limit(100);

        if (!wErr && supaW) {
          return NextResponse.json({ withdrawals: supaW });
        }
      } else {
        const { data: supaW, error: wErr } = await supabase
          .from("Withdrawal")
          .select("*")
          .eq("userId", userId)
          .order("createdAt", { ascending: false });

        if (!wErr && supaW) {
          return NextResponse.json({ withdrawals: supaW });
        }
      }
    } catch (supaErr) {
      console.warn("Supabase withdrawals GET fallback to prisma:", supaErr);
    }

    if (all && userRole === "ADMIN" && isAdminEmail(userEmail)) {
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
    const supabase = getSupabaseAdmin();

    // 1. Fetch current settings via Supabase
    let setting = {
      minWithdrawalInr: 100.0,
      cashoutBufferPercent: 6.0,
      usdtInrRate: 90.5,
    };

    try {
      const { data: supaSetting } = await supabase
        .from("Setting")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (supaSetting) {
        setting = {
          minWithdrawalInr: supaSetting.minWithdrawalInr ?? 100.0,
          cashoutBufferPercent: supaSetting.cashoutBufferPercent ?? 6.0,
          usdtInrRate: supaSetting.usdtInrRate ?? 90.5,
        };
      }
    } catch {}

    const minAmount = setting.minWithdrawalInr;
    const bufferPercent = setting.cashoutBufferPercent;

    // 2. Fetch live USDT rate
    const usdtRate = await getLiveUsdtInrRate(setting.usdtInrRate);

    // 3. Check User Balance & IsWithdrawing
    const { data: user } = await supabase
      .from("User")
      .select("id, walletBalance, isWithdrawing")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isWithdrawing) {
      return NextResponse.json(
        {
          error: "A withdrawal is already currently in progress for your account. Please wait.",
        },
        { status: 400 }
      );
    }

    const withdrawAmount = parsed.data.amountInr || user.walletBalance;

    if (withdrawAmount < minAmount) {
      return NextResponse.json(
        {
          error: `Minimum withdrawal amount is ₹${minAmount}. Your current balance is ₹${Number(
            user.walletBalance
          ).toFixed(2)}.`,
        },
        { status: 400 }
      );
    }

    if (user.walletBalance < withdrawAmount) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You requested ₹${withdrawAmount}, but have ₹${Number(
            user.walletBalance
          ).toFixed(2)}.`,
        },
        { status: 400 }
      );
    }

    // Calculate 6% buffer: e.g. ₹100 becomes ₹106 worth of USDT
    const bufferedInr = Number(
      (withdrawAmount * (1 + bufferPercent / 100)).toFixed(2)
    );
    const usdtAmount = Number((bufferedInr / usdtRate).toFixed(4));

    // Deduct user balance & lock isWithdrawing
    const newBal = Number((user.walletBalance - withdrawAmount).toFixed(2));
    await supabase
      .from("User")
      .update({
        walletBalance: newBal,
        isWithdrawing: true,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId);

    const chosenNetwork = parsed.data.network || "BSC";

    // Create withdrawal record
    const withdrawalId = `wd_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    const { data: withdrawalRecord, error: wdErr } = await supabase
      .from("Withdrawal")
      .insert({
        id: withdrawalId,
        userId,
        amountInr: withdrawAmount,
        bufferedInr,
        usdtAmount,
        network: chosenNetwork,
        walletAddress,
        status: "PROCESSING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (wdErr || !withdrawalRecord) {
      // rollback balance
      await supabase
        .from("User")
        .update({ walletBalance: user.walletBalance, isWithdrawing: false })
        .eq("id", userId);
      throw new Error(wdErr?.message || "Failed to create withdrawal record");
    }

    // 4. Trigger NOWPayments automated payout
    const payoutResult = await executeNowpaymentsPayout({
      withdrawalId,
      walletAddress,
      usdtAmount,
      network: chosenNetwork,
    });

    if (!payoutResult.success) {
      // Rollback
      await supabase
        .from("User")
        .update({
          walletBalance: user.walletBalance,
          isWithdrawing: false,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", userId);

      await supabase
        .from("Withdrawal")
        .update({
          status: "FAILED",
          errorMessage: payoutResult.error || "Payout gateway error",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      return NextResponse.json(
        {
          error: `Payout execution failed: ${payoutResult.error}. Your balance has been fully refunded.`,
        },
        { status: 502 }
      );
    }

    const finalStatus = payoutResult.simulated ? "FINISHED" : "PROCESSING";

    const { data: updatedWithdrawal } = await supabase
      .from("Withdrawal")
      .update({
        nowpaymentsPayoutId: payoutResult.payoutId || null,
        batchWithdrawalId: payoutResult.batchId || null,
        txHash: payoutResult.txHash || null,
        status: finalStatus,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", withdrawalId)
      .select()
      .single();

    // Unlock user
    await supabase
      .from("User")
      .update({ isWithdrawing: false, updatedAt: new Date().toISOString() })
      .eq("id", userId);

    // Send automated email confirmation
    const userEmail = (session.user as any)?.email;
    const userName = (session.user as any)?.name;
    if (userEmail) {
      sendWithdrawalInitiatedEmail({
        toEmail: userEmail,
        userName,
        withdrawalId,
        amountInr: withdrawAmount,
        bufferedInr,
        usdtAmount,
        network: chosenNetwork,
        walletAddress,
        txHash: payoutResult.txHash,
      }).catch((err) => console.error("Withdrawal email dispatch error:", err));
    }

    return NextResponse.json(
      {
        success: true,
        message: `Payout initiated! Sent ${usdtAmount} USDT (Polygon) to ${walletAddress}.`,
        withdrawal: updatedWithdrawal,
        bufferedInr,
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
