import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";

// POST /api/admin/nowpayments/deposit - Generate an official deposit address to fund Custody
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = (session?.user as any)?.email;

    if (!session || (session.user as any)?.role !== "ADMIN" || !isAdminEmail(email)) {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const amountUsd = parseFloat(body.amountUsd) || 10.0;
    const payCurrency = body.currency || "usdtmatic"; // USDT on Polygon network

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    const apiUrl = process.env.NOWPAYMENTS_API_URL || "https://api.nowpayments.io/v1";

    if (!apiKey) {
      return NextResponse.json(
        { error: "NOWPAYMENTS_API_KEY is not configured in .env" },
        { status: 400 }
      );
    }

    const payload = {
      price_amount: amountUsd,
      price_currency: "usd",
      pay_currency: payCurrency,
      order_id: `CUSTODY_TOPUP_${Date.now()}`,
      order_description: `Admin Custody Top-Up: ${amountUsd} USD`,
    };

    const res = await fetch(`${apiUrl}/payment`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `NOWPayments deposit creation error: ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      depositAddress: data.pay_address,
      amountToPay: data.pay_amount,
      currency: data.pay_currency,
      paymentId: data.payment_id,
      network: "POLYGON (MATIC)",
      expiresAt: data.expiration_estimate_date,
      instructions: `Send exactly ${data.pay_amount} USDT on Polygon to the deposit address. Once confirmed on blockchain, NOWPayments will automatically credit your Custody balance.`,
    });
  } catch (error: any) {
    console.error("NOWPayments deposit route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create deposit address" },
      { status: 500 }
    );
  }
}
