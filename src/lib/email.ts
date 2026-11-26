import nodemailer from "nodemailer";

interface WithdrawalEmailParams {
  toEmail: string;
  userName?: string;
  withdrawalId: string;
  amountInr: number;
  bufferedInr: number;
  usdtAmount: number;
  network: string; // "BSC" | "POLYGON"
  walletAddress: string;
  txHash?: string;
}

// Create reusable SMTP transporter
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

const FROM_EMAIL =
  process.env.EMAIL_FROM || '"ReviewReward Payouts" <payouts@reviewreward.in>';

/**
 * Send email when withdrawal is initiated & dispatched
 */
export async function sendWithdrawalInitiatedEmail(params: WithdrawalEmailParams) {
  const {
    toEmail,
    userName = "Data Principal",
    withdrawalId,
    amountInr,
    bufferedInr,
    usdtAmount,
    network,
    walletAddress,
    txHash,
  } = params;

  const isBsc = network.toUpperCase() === "BSC";
  const explorerUrl = txHash
    ? isBsc
      ? `https://bscscan.com/tx/${txHash}`
      : `https://polygonscan.com/tx/${txHash}`
    : null;

  const networkLabel = isBsc ? "BNB Smart Chain (BSC / BEP-20)" : "Polygon POS (MATIC)";
  const bufferAdded = (bufferedInr - amountInr).toFixed(2);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ReviewReward Payout Dispatched</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px 12px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 24px; }
    .metric-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 20px 0; }
    .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; font-size: 13px; }
    .metric-row:last-child { border-bottom: none; }
    .highlight-green { color: #059669; font-weight: bold; }
    .highlight-blue { color: #2563eb; font-weight: bold; font-size: 18px; }
    .address-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; font-family: monospace; font-size: 12px; word-break: break-all; color: #1e3a8a; margin: 16px 0; }
    .coindcx-note { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 12px; color: #065f46; line-height: 1.5; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 13px; text-align: center; margin-top: 10px; }
    .footer { text-align: center; font-size: 11px; color: #64748b; padding: 24px; border-top: 1px solid #e2e8f0; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">ReviewReward</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Automated Crypto Payout Dispatched</p>
    </div>

    <div class="content">
      <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Hello ${userName},</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Your requested cashout has been successfully processed and dispatched via our automated crypto payment gateway.
      </p>

      <div class="metric-box">
        <div class="metric-row">
          <span>Requested Amount:</span>
          <strong>₹${amountInr.toFixed(0)} INR</strong>
        </div>
        <div class="metric-row">
          <span>Platform Buffer Bonus (+14%):</span>
          <span class="highlight-green">+₹${bufferAdded} INR</span>
        </div>
        <div class="metric-row">
          <span>Total Buffered INR Value:</span>
          <strong>₹${bufferedInr.toFixed(2)} INR</strong>
        </div>
        <div class="metric-row" style="margin-top: 6px; padding-top: 12px; border-top: 2px solid #cbd5e1;">
          <span style="font-size: 15px; font-weight: bold;">USDT Sent:</span>
          <span class="highlight-blue">${usdtAmount} USDT</span>
        </div>
        <div class="metric-row">
          <span>Network:</span>
          <strong style="color: #2563eb;">${networkLabel}</strong>
        </div>
      </div>

      <div style="font-size: 13px; font-weight: 600; color: #334155;">Destination Wallet Address:</div>
      <div class="address-box">${walletAddress}</div>

      ${
        isBsc
          ? `
      <div class="coindcx-note">
        <strong>🏦 Indian Bank Transfer (CoinDCX):</strong><br>
        Because your payout was sent to your CoinDCX BSC address, you can sell your USDT on CoinDCX for INR and withdraw directly to your Indian bank account via IMPS/UPI. Our +14% buffer was added specifically to cover CoinDCX's 1% TDS, trading fee, and the ₹10 bank IMPS fee!
      </div>
      `
          : ""
      }

      ${
        explorerUrl
          ? `
      <div style="text-align: center; margin-top: 24px;">
        <a href="${explorerUrl}" class="btn" target="_blank">View on Blockchain Explorer</a>
      </div>
      `
          : ""
      }

      <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; font-family: monospace;">
        Payout Reference ID: ${withdrawalId}
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">© 2026 ReviewReward. All rights reserved.</p>
      <p style="margin: 0;">Compliant with India Digital Personal Data Protection (DPDP) Act, 2023.</p>
    </div>
  </div>
</body>
</html>
  `;

  const transporter = getTransporter();
  if (!transporter) {
    console.log(
      `[SIMULATED EMAIL] To: ${toEmail} | Payout: ${usdtAmount} USDT to ${walletAddress}`
    );
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `Payout Dispatched: ${usdtAmount} USDT (₹${amountInr.toFixed(0)} + 14% Buffer) - ReviewReward`,
      html: htmlContent,
    });
    console.log(`[EMAIL SENT] MessageId: ${info.messageId} to ${toEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("Failed to send withdrawal email:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send email when blockchain finality is confirmed (via Webhook)
 */
export async function sendWithdrawalCompletedEmail(params: WithdrawalEmailParams) {
  const { toEmail, userName = "User", usdtAmount, txHash, network } = params;
  const isBsc = network.toUpperCase() === "BSC";
  const explorerUrl = txHash
    ? isBsc
      ? `https://bscscan.com/tx/${txHash}`
      : `https://polygonscan.com/tx/${txHash}`
    : "#";

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[SIMULATED EMAIL COMPLETED] To: ${toEmail} | Hash: ${txHash}`);
    return { success: true, simulated: true };
  }

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `Withdrawal Completed on Blockchain: ${usdtAmount} USDT - ReviewReward`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #0f172a; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #059669;">✓ Payout Confirmed on Blockchain</h2>
          <p>Hello ${userName},</p>
          <p>Your withdrawal of <strong>${usdtAmount} USDT</strong> has been fully confirmed on the ${
        isBsc ? "BNB Smart Chain" : "Polygon"
      } network.</p>
          <p><a href="${explorerUrl}" style="background: #2563eb; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 8px; display: inline-block;">View Transaction Receipt</a></p>
          <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Thank you for contributing verified reviews on ReviewReward.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (err: any) {
    console.error("Failed to send completed email:", err.message);
    return { success: false, error: err.message };
  }
}
