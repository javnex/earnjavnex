import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyNowpaymentsIpnSignature } from "@/lib/nowpayments";
import { sendWithdrawalConfirmationEmail } from "@/lib/mailer";

// POST /api/webhooks/nowpayments
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("x-nowpayments-sig") || "";

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Verify HMAC-SHA512 signature
    const isValid = verifyNowpaymentsIpnSignature(payload, sig);
    if (!isValid) {
      console.warn("NOWPayments IPN signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const { id, batch_withdrawal_id, status, hash, unique_external_id } = payload;
    const withdrawalId = unique_external_id;

    if (!withdrawalId && !batch_withdrawal_id) {
      return NextResponse.json({ received: true });
    }

    const withdrawal = await prisma.withdrawal.findFirst({
      where: {
        OR: [
          ...(withdrawalId ? [{ id: withdrawalId }] : []),
          ...(batch_withdrawal_id ? [{ batchWithdrawalId: String(batch_withdrawal_id) }] : []),
        ],
      },
      include: { user: true },
    });

    if (!withdrawal) {
      return NextResponse.json({ received: true, note: "Withdrawal not found" });
    }

    const normalizedStatus = String(status).toUpperCase();

    if (normalizedStatus === "FINISHED" || normalizedStatus === "COMPLETED") {
      const isAlreadySent = !!(withdrawal as any).withdrawal_email_sent_at;

      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "FINISHED",
          txHash: hash || withdrawal.txHash,
          ...(!isAlreadySent ? { withdrawal_email_sent_at: new Date() } : {}),
        },
      });

      // Mirror to Supabase HTTPS
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from("Withdrawal")
          .update({
            status: "FINISHED",
            txHash: hash || withdrawal.txHash,
            ...(!isAlreadySent ? { withdrawal_email_sent_at: new Date().toISOString() } : {}),
          })
          .eq("id", withdrawal.id);
      } catch (err) {
        console.warn("Supabase webhook sync fallback:", err);
      }

      // Idempotent: Send receipt email to user only once
      if (!isAlreadySent && withdrawal.user?.email) {
        try {
          await sendWithdrawalConfirmationEmail(withdrawal.user.email, {
            userName: withdrawal.user.name || "Member",
            withdrawalId: withdrawal.id,
            amountInr: withdrawal.amountInr,
            bufferedInr: withdrawal.bufferedInr,
            usdtAmount: withdrawal.usdtAmount,
            network: withdrawal.network,
            walletAddress: withdrawal.walletAddress,
            txHash: hash || withdrawal.txHash,
          });
        } catch (err) {
          console.error("Webhook completed email dispatch error:", err);
        }
      }
    } else if (
      normalizedStatus === "FAILED" ||
      normalizedStatus === "REJECTED" ||
      normalizedStatus === "EXPIRED"
    ) {
      // Refund balance if failed
      if (withdrawal.status !== "FAILED") {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: withdrawal.userId },
            data: {
              walletBalance: { increment: withdrawal.amountInr },
              isWithdrawing: false,
            },
          }),
          prisma.withdrawal.update({
            where: { id: withdrawal.id },
            data: {
              status: "FAILED",
              errorMessage: `NOWPayments reported: ${status}`,
            },
          }),
        ]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("NOWPayments Webhook error:", error);
    return NextResponse.json({ error: "Webhook handling error" }, { status: 500 });
  }
}
