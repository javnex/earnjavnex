import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import {
  getNowpaymentsAuthToken,
  getNowpaymentsBalance,
  generateTOTP,
} from "@/lib/nowpayments";

// POST /api/admin/nowpayments/test - Test NOWPayments API credentials & balance
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const email = (session?.user as any)?.email;

    if (!session || (session.user as any)?.role !== "ADMIN" || !isAdminEmail(email)) {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    const npEmail = process.env.NOWPAYMENTS_EMAIL;
    const npPassword = process.env.NOWPAYMENTS_PASSWORD;
    const twoFaSecret = process.env.NOWPAYMENTS_2FA_SECRET;
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

    const configStatus = {
      hasApiKey: !!apiKey,
      hasEmail: !!npEmail,
      hasPassword: !!npPassword,
      has2faSecret: !!twoFaSecret,
      hasIpnSecret: !!ipnSecret,
    };

    if (!apiKey && !npEmail && !npPassword) {
      return NextResponse.json({
        connected: false,
        mode: "SIMULATION",
        message: "NOWPayments credentials are currently empty in .env. Platform is running in simulated test mode.",
        configStatus,
      });
    }

    const checks: {
      auth: boolean;
      balance: boolean;
      twoFa: boolean;
      balances?: any;
      error?: string;
    } = {
      auth: false,
      balance: false,
      twoFa: false,
    };

    // 1. Test Auth Token
    try {
      if (npEmail && npPassword) {
        await getNowpaymentsAuthToken();
        checks.auth = true;
      }
    } catch (authErr: any) {
      checks.error = `Authentication failed: ${authErr.message}`;
    }

    // 2. Test Balance & API Key
    try {
      if (apiKey) {
        const bal = await getNowpaymentsBalance();
        checks.balance = true;
        checks.balances = bal.balances;
      }
    } catch (balErr: any) {
      if (!checks.error) {
        checks.error = `Balance check failed: ${balErr.message}`;
      }
    }

    // 3. Test 2FA TOTP Secret
    if (twoFaSecret) {
      try {
        const code = generateTOTP(twoFaSecret);
        checks.twoFa = code.length === 6 && /^\d+$/.test(code);
      } catch (totpErr: any) {
        if (!checks.error) {
          checks.error = `2FA Secret invalid: ${totpErr.message}`;
        }
      }
    }

    const isFullyConnected = checks.auth && checks.balance && checks.twoFa;

    return NextResponse.json({
      connected: isFullyConnected,
      mode: isFullyConnected ? "LIVE_AUTOMATED" : "PARTIAL_CONFIG",
      checks,
      configStatus,
      message: isFullyConnected
        ? "NOWPayments automated payout gateway is fully connected and ready to disburse funds!"
        : checks.error || "Some credentials need attention.",
    });
  } catch (error: any) {
    console.error("NOWPayments test route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to test NOWPayments connection" },
      { status: 500 }
    );
  }
}
