import crypto from "crypto";

const NOWPAYMENTS_API_URL =
  process.env.NOWPAYMENTS_API_URL || "https://api.nowpayments.io/v1";
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const NOWPAYMENTS_EMAIL = process.env.NOWPAYMENTS_EMAIL || "";
const NOWPAYMENTS_PASSWORD = process.env.NOWPAYMENTS_PASSWORD || "";
const NOWPAYMENTS_2FA_SECRET = process.env.NOWPAYMENTS_2FA_SECRET || "";
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";

// In-memory cache for auth JWT
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Standard RFC 6238 TOTP generator for 2FA verification with NOWPayments
 */
export function generateTOTP(base32Secret: string): string {
  if (!base32Secret) return "000000";
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32Secret.toUpperCase().replace(/[\s=-]/g, "");

  let bits = "";
  for (let i = 0; i < cleaned.length; i++) {
    const val = base32chars.indexOf(cleaned.charAt(i));
    if (val >= 0) {
      bits += val.toString(2).padStart(5, "0");
    }
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  const key = Buffer.from(bytes);

  const epoch = Math.floor(Date.now() / 1000);
  const time = Buffer.alloc(8);
  time.writeBigInt64BE(BigInt(Math.floor(epoch / 30)));

  const hmac = crypto.createHmac("sha1", key).update(time).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, "0");
}

/**
 * Get JWT Authentication Token from NOWPayments
 */
export async function getNowpaymentsAuthToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  if (!NOWPAYMENTS_EMAIL || !NOWPAYMENTS_PASSWORD) {
    throw new Error(
      "NOWPayments credentials (NOWPAYMENTS_EMAIL / NOWPAYMENTS_PASSWORD) are not configured."
    );
  }

  const res = await fetch(`${NOWPAYMENTS_API_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: NOWPAYMENTS_EMAIL,
      password: NOWPAYMENTS_PASSWORD,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NOWPayments auth failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const token = data.token;
  cachedToken = {
    token,
    expiresAt: now + 5 * 60 * 1000, // 5 min cache
  };

  return token;
}

/**
 * Fetch custody balances from NOWPayments
 */
export async function getNowpaymentsBalance(): Promise<{
  balances: Record<string, { amount: number; pendingAmount: number }>;
  raw: any;
}> {
  if (!NOWPAYMENTS_API_KEY) {
    return {
      balances: {
        usdtmatic: { amount: 0.0, pendingAmount: 0 },
        matic: { amount: 0.0, pendingAmount: 0 },
      },
      raw: { simulated: true },
    };
  }

  try {
    const res = await fetch(`${NOWPAYMENTS_API_URL}/balance`, {
      headers: {
        "x-api-key": NOWPAYMENTS_API_KEY,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch balance: ${res.statusText}`);
    }

    const data = await res.json();
    return { balances: data.balances || {}, raw: data };
  } catch (err: any) {
    console.error("NOWPayments getBalance error:", err.message);
    return {
      balances: {
        usdtmatic: { amount: 0.0, pendingAmount: 0 },
      },
      raw: { error: err.message },
    };
  }
}

/**
 * Fetch live USDT / INR conversion rate with fallback
 */
export async function getLiveUsdtInrRate(fallbackRate = 90.5): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr",
      {
        next: { revalidate: 300 }, // 5 min cache
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.tether?.inr && typeof data.tether.inr === "number") {
        return Number(data.tether.inr.toFixed(2));
      }
    }
  } catch (e) {
    console.warn("CoinGecko rate fetch failed, using fallback:", fallbackRate);
  }
  return fallbackRate;
}

/**
 * Create and execute Mass Payout via NOWPayments API
 * Includes automatic 2FA TOTP verification
 */
export async function executeNowpaymentsPayout(params: {
  withdrawalId: string;
  walletAddress: string;
  usdtAmount: number;
  network?: string; // "BSC" | "POLYGON"
}): Promise<{
  success: boolean;
  batchId?: string;
  payoutId?: string;
  txHash?: string;
  simulated?: boolean;
  error?: string;
}> {
  const { withdrawalId, walletAddress, usdtAmount, network = "BSC" } = params;

  // Validation: EVM address format (BSC and Polygon both use 42-char 0x... format)
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error(
      "Invalid EVM wallet address. Must be a 42-character address starting with 0x."
    );
  }

  // Ticker: usdtbsc (CoinDCX / BSC BEP-20) or usdtmatic (Polygon)
  const currencyTicker = network.toUpperCase() === "POLYGON" ? "usdtmatic" : "usdtbsc";

  // If live credentials are not set, run seamless sandbox / simulated payout
  if (!NOWPAYMENTS_API_KEY || !NOWPAYMENTS_EMAIL || !NOWPAYMENTS_PASSWORD) {
    console.log(
      `[NOWPayments SIMULATION] Processing payout of ${usdtAmount} USDT to ${walletAddress}`
    );
    const mockTxHash =
      "0x" + crypto.randomBytes(32).toString("hex");
    const mockBatchId = "batch_sim_" + Date.now();
    const mockPayoutId = "payout_sim_" + Date.now();

    return {
      success: true,
      batchId: mockBatchId,
      payoutId: mockPayoutId,
      txHash: mockTxHash,
      simulated: true,
    };
  }

  try {
    // 1. Authenticate
    const token = await getNowpaymentsAuthToken();

    // 2. Create Payout
    const callbackUrl = `${
      process.env.NEXTAUTH_URL || "https://reviewreward.com"
    }/api/webhooks/nowpayments`;

    const payoutPayload = {
      ipn_callback_url: callbackUrl,
      withdrawals: [
        {
          address: walletAddress,
          currency: currencyTicker,
          amount: usdtAmount,
          unique_external_id: withdrawalId,
        },
      ],
    };

    const payoutRes = await fetch(`${NOWPAYMENTS_API_URL}/payout`, {
      method: "POST",
      headers: {
        "x-api-key": NOWPAYMENTS_API_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payoutPayload),
    });

    if (!payoutRes.ok) {
      const errText = await payoutRes.text();
      throw new Error(`NOWPayments payout creation failed: ${errText}`);
    }

    const payoutData = await payoutRes.json();
    const batchId = payoutData.id || payoutData.batch_withdrawal_id;
    const item = payoutData.withdrawals?.[0];
    const payoutId = item?.id ? String(item.id) : undefined;

    // 3. Automated 2FA TOTP Verification
    if (NOWPAYMENTS_2FA_SECRET && batchId) {
      const totpCode = generateTOTP(NOWPAYMENTS_2FA_SECRET);

      const verifyRes = await fetch(
        `${NOWPAYMENTS_API_URL}/payout/${batchId}/verify`,
        {
          method: "POST",
          headers: {
            "x-api-key": NOWPAYMENTS_API_KEY,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            verification_code: totpCode,
          }),
        }
      );

      if (!verifyRes.ok) {
        console.warn(
          "2FA TOTP verification warning:",
          await verifyRes.text()
        );
      }
    }

    return {
      success: true,
      batchId: String(batchId),
      payoutId,
      txHash: item?.hash,
      simulated: false,
    };
  } catch (err: any) {
    console.error("executeNowpaymentsPayout error:", err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Verify NOWPayments IPN Signature (HMAC-SHA512)
 */
export function verifyNowpaymentsIpnSignature(
  payload: Record<string, any>,
  receivedSig: string
): boolean {
  if (!NOWPAYMENTS_IPN_SECRET) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "NOWPAYMENTS_IPN_SECRET is not configured in production. Rejecting IPN webhook for security."
      );
      return false;
    }
    return true; // Local development convenience
  }

  // Sort keys alphabetically
  const sortedKeys = Object.keys(payload).sort();
  const sortedObj: Record<string, any> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = payload[k];
  }

  const jsonString = JSON.stringify(sortedObj);
  const hmac = crypto
    .createHmac("sha512", NOWPAYMENTS_IPN_SECRET)
    .update(jsonString)
    .digest("hex");

  return hmac === receivedSig;
}
