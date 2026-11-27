import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import { sendHttpsEmail } from "@/lib/mailer";
import { getEnv } from "@/lib/env";

// POST /api/admin/email/test - Send a live test email to verify credentials and delivery
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const adminEmail = (session?.user as any)?.email;

    if (!session || (session.user as any)?.role !== "ADMIN" || !isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = body.to || adminEmail || "javnex.review@gmail.com";
    const senderType = body.senderType || "task"; // "task" | "payments"

    const fromAddress =
      senderType === "payments"
        ? getEnv("PAYMENTS_FROM_EMAIL") || "ReviewReward Payouts <payments@javnex.in>"
        : getEnv("TASKS_FROM_EMAIL") || "ReviewReward Tasks <task@javnex.in>";

    const hasResend = !!getEnv("RESEND_API_KEY");
    const hasZepto = !!getEnv("ZEPTOMAIL_TOKEN");
    const hasBrevo = !!getEnv("BREVO_API_KEY");

    if (!hasResend && !hasZepto && !hasBrevo) {
      return NextResponse.json({
        success: false,
        error: "No email provider secret found in environment! Please ensure RESEND_API_KEY is saved in Cloudflare Worker Settings > Variables and Secrets.",
        configStatus: { hasResend, hasZepto, hasBrevo },
      }, { status: 400 });
    }

    const result = await sendHttpsEmail({
      from: fromAddress,
      to: targetEmail,
      subject: `[Test] ReviewReward Live Email Verification (${senderType.toUpperCase()})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #2563eb; margin-top: 0;">ReviewReward Email Test Succeeded! 🎉</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Your Cloudflare Worker HTTPS mailer is connected and functioning properly with your verified domain <strong>javnex.in</strong>.
          </p>
          <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px; margin: 18px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #1e293b;"><strong>Sender:</strong> ${fromAddress}</p>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #1e293b;"><strong>Recipient:</strong> ${targetEmail}</p>
            <p style="margin: 0; font-size: 13px; color: #1e293b;"><strong>Provider:</strong> ${hasResend ? "Resend HTTPS API" : hasZepto ? "Zoho ZeptoMail" : "Brevo"}</p>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; pt: 12px;">
            Replies to this email are routed directly to <code>info@javnex.in</code> in Zoho Mail.
          </p>
        </div>
      `,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email successfully dispatched to ${targetEmail} from ${fromAddress}!`,
        id: result.id,
        provider: hasResend ? "Resend" : hasZepto ? "ZeptoMail" : "Brevo",
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to dispatch email",
        provider: hasResend ? "Resend" : hasZepto ? "ZeptoMail" : "Brevo",
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || "Internal server error while sending test email",
    }, { status: 500 });
  }
}
