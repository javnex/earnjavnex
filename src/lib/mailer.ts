/**
 * Workers-Compatible HTTPS Mailer for earn.javnex.in
 * Built using pure Web Fetch API (no nodemailer, raw TCP sockets, or Node net/tls).
 * Supports Resend, Zoho ZeptoMail, Brevo, or graceful local mock logging.
 */

export interface WithdrawalEmailPayload {
  userName?: string;
  withdrawalId: string;
  amountInr: number;
  bufferedInr?: number;
  usdtAmount: number;
  network?: string;
  walletAddress: string;
  txHash?: string | null;
}

export interface TaskAlertEmailPayload {
  userName?: string;
  taskId: string;
  title: string;
  rewardInr: number;
  instructions?: string;
  userEmail?: string;
}

const PAYMENTS_FROM_EMAIL =
  process.env.PAYMENTS_FROM_EMAIL || "ReviewReward Payouts <payments@javnex.in>";
const TASKS_FROM_EMAIL =
  process.env.TASKS_FROM_EMAIL || "ReviewReward Tasks <task@javnex.in>";
const REPLY_TO_EMAIL =
  process.env.REPLY_TO_EMAIL || "info@javnex.in";
const APP_URL =
  process.env.NEXTAUTH_URL || "https://earn.javnex.in";

/**
 * Universal HTTPS email dispatch using standard Web fetch()
 */
export async function sendHttpsEmail({
  from,
  to,
  subject,
  html,
  replyTo = REPLY_TO_EMAIL,
}: {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  // 1. Try Resend API (Most common & reliable on Cloudflare Workers)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: replyTo,
          subject,
          html,
        }),
      });

      const data = (await res.json()) as any;
      if (res.ok) {
        return { success: true, id: data.id };
      }
      return { success: false, error: data.message || "Resend dispatch failed" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 2. Try Zoho ZeptoMail API (Zoho's official transactional REST API)
  const zeptoToken = process.env.ZEPTOMAIL_TOKEN;
  if (zeptoToken) {
    try {
      const zeptoUrl = process.env.ZEPTOMAIL_URL || "https://api.zeptomail.in/v1.1/email";
      const fromAddress = from.includes("<") ? from.split("<")[1].replace(">", "").trim() : from;
      const fromName = from.includes("<") ? from.split("<")[0].trim().replace(/"/g, "") : "ReviewReward";

      const res = await fetch(zeptoUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: zeptoToken.startsWith("Zoho-enczapikey")
            ? zeptoToken
            : `Zoho-enczapikey ${zeptoToken}`,
        },
        body: JSON.stringify({
          from: { address: fromAddress, name: fromName },
          to: [{ email_address: { address: to } }],
          reply_to: [{ address: replyTo, name: "Support" }],
          subject,
          htmlbody: html,
        }),
      });

      const data = (await res.json()) as any;
      if (res.ok) {
        return { success: true, id: data.data?.[0]?.message_id };
      }
      return { success: false, error: data.message || "ZeptoMail dispatch failed" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 3. Try Brevo (Sendinblue) HTTPS API
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    try {
      const fromAddress = from.includes("<") ? from.split("<")[1].replace(">", "").trim() : from;
      const fromName = from.includes("<") ? from.split("<")[0].trim().replace(/"/g, "") : "ReviewReward";

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromAddress },
          to: [{ email: to }],
          replyTo: { email: replyTo },
          subject,
          htmlContent: html,
        }),
      });

      const data = (await res.json()) as any;
      if (res.ok) {
        return { success: true, id: data.messageId };
      }
      return { success: false, error: data.message || "Brevo dispatch failed" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Fallback: Log to console in development / if provider keys are missing
  console.log(`[HTTPS Mailer Mock Dispatch] To: ${to} | Subject: "${subject}" | From: ${from}`);
  return { success: true, id: `mock_${Date.now()}` };
}

/**
 * 1. Send Instant Withdrawal Receipt from payments@javnex.in
 */
export async function sendWithdrawalConfirmationEmail(
  toEmail: string,
  payload: WithdrawalEmailPayload
): Promise<boolean> {
  const {
    userName = "Verified Member",
    withdrawalId,
    amountInr,
    bufferedInr = amountInr,
    usdtAmount,
    network = "POLYGON",
    walletAddress,
    txHash,
  } = payload;

  const isPolygon = network.toUpperCase().includes("POLYGON");
  const explorerUrl = txHash
    ? isPolygon
      ? `https://polygonscan.com/tx/${txHash}`
      : `https://bscscan.com/tx/${txHash}`
    : null;

  const subject = `Payout Completed: ${usdtAmount} USDT (₹${amountInr.toFixed(0)}) - ReviewReward`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>ReviewReward Payout Completed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px 12px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 24px; }
    .metric-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 20px 0; }
    .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; font-size: 13px; }
    .metric-row:last-child { border-bottom: none; }
    .highlight-green { color: #059669; font-weight: bold; font-size: 16px; }
    .highlight-blue { color: #2563eb; font-weight: bold; }
    .address-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 12px; font-family: monospace; font-size: 12px; word-break: break-all; color: #1e3a8a; margin: 16px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 13px; text-align: center; margin-top: 12px; }
    .footer { text-align: center; font-size: 11px; color: #64748b; padding: 20px; border-top: 1px solid #e2e8f0; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">ReviewReward</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Official Blockchain Payout Receipt</p>
    </div>

    <div class="content">
      <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Hello ${userName},</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Your withdrawal has been completed and confirmed on the blockchain. The crypto funds have been delivered directly to your external wallet.
      </p>

      <div class="metric-box">
        <div class="metric-row">
          <span style="color: #64748b;">Withdrawal ID:</span>
          <span style="font-family: monospace; font-weight: 600;">${withdrawalId}</span>
        </div>
        <div class="metric-row">
          <span style="color: #64748b;">Requested Cashout:</span>
          <span style="font-weight: 600;">₹${amountInr.toFixed(0)} INR</span>
        </div>
        <div class="metric-row">
          <span style="color: #64748b;">Crypto Credited:</span>
          <span class="highlight-green">${usdtAmount} USDT</span>
        </div>
        <div class="metric-row">
          <span style="color: #64748b;">Network:</span>
          <span style="font-weight: 600;">${network}</span>
        </div>
        ${txHash ? `
        <div class="metric-row">
          <span style="color: #64748b;">Transaction Hash:</span>
          <span style="font-family: monospace; font-size: 11px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${txHash}</span>
        </div>` : ""}
      </div>

      <div style="font-size: 12px; color: #475569; margin-bottom: 4px; font-weight: 600;">Destination Wallet Address:</div>
      <div class="address-box">${walletAddress}</div>

      ${explorerUrl ? `
      <div style="text-align: center; margin-top: 20px;">
        <a href="${explorerUrl}" class="btn" target="_blank" rel="noopener noreferrer">View on Blockchain Explorer &rarr;</a>
      </div>` : ""}
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">&copy; 2026 ReviewReward (earn.javnex.in). All rights reserved.</p>
      <p style="margin: 0; color: #94a3b8;">Sent via automated payment gateway. Replies routed to ${REPLY_TO_EMAIL}</p>
    </div>
  </div>
</body>
</html>
  `;

  const result = await sendHttpsEmail({
    from: PAYMENTS_FROM_EMAIL,
    to: toEmail,
    subject,
    html,
  });

  return result.success;
}

/**
 * 2. Send New Task Broadcast Email from task@javnex.in
 */
export async function sendNewTaskAlertEmail(
  toEmail: string,
  payload: TaskAlertEmailPayload
): Promise<boolean> {
  const {
    userName = "Valued Reviewer",
    title,
    rewardInr,
    instructions,
  } = payload;

  const subject = `New Task Available: Earn ₹${rewardInr.toFixed(0)} on ReviewReward`;
  const taskUrl = `${APP_URL}/dashboard/tasks`;
  const unsubscribeUrl = `${APP_URL}/unsubscribe?email=${encodeURIComponent(toEmail)}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>New Micro-Task Alert</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px 12px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 24px; }
    .task-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px; margin: 20px 0; }
    .reward-pill { display: inline-block; background: #059669; color: #ffffff; font-weight: 800; font-size: 14px; padding: 6px 14px; border-radius: 9999px; }
    .btn { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 14px; font-weight: bold; font-size: 14px; text-align: center; }
    .footer { text-align: center; font-size: 11px; color: #64748b; padding: 20px; border-top: 1px solid #e2e8f0; background: #fafafa; }
    .unsubscribe { color: #94a3b8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800;">ReviewReward</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">New Verified Shop Review Task</p>
    </div>

    <div class="content">
      <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Hi ${userName},</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        A new verified shop review task has just been published on your ReviewReward terminal!
      </p>

      <div class="task-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #065f46;">${title}</h3>
          <span class="reward-pill">+₹${rewardInr.toFixed(0)} INR</span>
        </div>
        ${instructions ? `<p style="font-size: 12px; color: #166534; line-height: 1.5; margin: 0;">${instructions.substring(0, 160)}...</p>` : ""}
      </div>

      <div style="text-align: center; margin: 24px 0 12px 0;">
        <a href="${taskUrl}" class="btn" target="_blank" rel="noopener noreferrer">Claim & Complete Task &rarr;</a>
      </div>
      <p style="text-align: center; font-size: 12px; color: #64748b;">
        First-come, first-served. Once maximum limits are reached, the task automatically closes.
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">&copy; 2026 ReviewReward (earn.javnex.in). All rights reserved.</p>
      <p style="margin: 0; color: #94a3b8;">
        You received this because task alerts are enabled in your account.
        <br />
        <a href="${unsubscribeUrl}" class="unsubscribe">Turn off task alert emails</a> | Replies routed to ${REPLY_TO_EMAIL}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const result = await sendHttpsEmail({
    from: TASKS_FROM_EMAIL,
    to: toEmail,
    subject,
    html,
  });

  return result.success;
}

/**
 * 3. Batch Broadcast New Task Alerts to Opted-In Users (20 at a time with delays)
 */
export async function broadcastNewTaskAlert(
  users: Array<{ email: string; name?: string | null }>,
  payload: Omit<TaskAlertEmailPayload, "userEmail">
): Promise<{ total: number; sent: number; failed: number }> {
  const CHUNK_SIZE = 20;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    const chunk = users.slice(i, i + CHUNK_SIZE);

    const promises = chunk.map(async (u) => {
      try {
        const ok = await sendNewTaskAlertEmail(u.email, {
          ...payload,
          userName: u.name || undefined,
          userEmail: u.email,
        });
        if (ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    });

    await Promise.all(promises);

    // Short polite pause between chunks (300ms) to respect rate limits
    if (i + CHUNK_SIZE < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return { total: users.length, sent, failed };
}
