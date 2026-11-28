import crypto from "node:crypto";
import { getEnv } from "@/lib/env";

export function getNowpaymentsApiUrl(): string {
  return (getEnv("NOWPAYMENTS_API_URL") || "https://api.nowpayments.io/v1")
    .trim()
    .replace(/\/+$/, "")
    .replace(/^["']|["']$/g, "");
}
export function getNowpaymentsAuthProxyUrl(): string {
  return (getEnv("NOWPAYMENTS_AUTH_PROXY_URL") || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/^["']|["']$/g, "");
}
export function getNowpaymentsApiKey(): string {
  return (getEnv("NOWPAYMENTS_API_KEY") || "").trim().replace(/^["']|["']$/g, "");
}
export function getNowpaymentsEmail(): string {
  return (getEnv("NOWPAYMENTS_EMAIL") || "").trim().replace(/^["']|["']$/g, "");
}
export function getNowpaymentsPassword(): string {
  return (getEnv("NOWPAYMENTS_PASSWORD") || "").trim().replace(/^["']|["']$/g, "");
}
export function getNowpayments2faSecret(): string {
  return (getEnv("NOWPAYMENTS_2FA_SECRET") || "").trim().replace(/^["']|["']$/g, "");
}
export function getNowpaymentsIpnSecret(): string {
  return (getEnv("NOWPAYMENTS_IPN_SECRET") || "").trim().replace(/^["']|["']$/g, "");
}

// In-memory cache + edge Cache API key (NOWPayments JWTs expire after ~300 seconds)
let cachedToken: { token: string; expiresAt: number } | null = null;
const JWT_SAFETY_BUFFER_MS = 30_000;

function parseJwtExpirationMs(token: string, fallbackNow: number): number {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return fallbackNow + 270_000;
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp === "number" && payload.exp > 0) {
      return payload.exp * 1000;
    }
  } catch {
    // Fallback to conservative 4.5-minute TTL
  }
  return fallbackNow + 270_000;
}

function getEdgeCacheKey(email: string): string {
  const hash = crypto.createHash("sha256").update(email).digest("hex").slice(0, 16);
  return `https://cache.earn.javnex.in/np-jwt-${hash}`;
}

async function readEdgeCachedToken(email: string, now: number): Promise<{ token: string; expiresAt: number } | null> {
  try {
    const cache = (globalThis as any).caches?.default;
    if (!cache) return null;
    const match = await cache.match(getEdgeCacheKey(email));
    if (!match) return null;
    const data = (await match.json()) as { token?: string; expiresAt?: number };
    if (data?.token && typeof data.expiresAt === "number" && data.expiresAt > now + JWT_SAFETY_BUFFER_MS) {
      return { token: data.token, expiresAt: data.expiresAt };
    }
  } catch {
    // Cache API unavailable in Node dev
  }
  return null;
}

async function writeEdgeCachedToken(email: string, token: string, expiresAt: number): Promise<void> {
  try {
    const cache = (globalThis as any).caches?.default;
    if (!cache) return;
    const ttlSeconds = Math.max(30, Math.floor((expiresAt - Date.now()) / 1000));
    await cache.put(
      getEdgeCacheKey(email),
      new Response(JSON.stringify({ token, expiresAt }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `max-age=${ttlSeconds}`,
        },
      })
    );
  } catch {
    // Cache API unavailable in Node dev
  }
}

async function clearCachedToken(email?: string): Promise<void> {
  cachedToken = null;
  if (!email) return;
  try {
    const cache = (globalThis as any).caches?.default;
    if (cache) {
      await cache.delete(getEdgeCacheKey(email));
    }
  } catch {
    // ignore
  }
}

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
export async function getNowpaymentsAuthToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  const email = getNowpaymentsEmail();
  const password = getNowpaymentsPassword();
  const apiUrl = getNowpaymentsApiUrl();
  const authProxyUrl = getNowpaymentsAuthProxyUrl();

  if (!forceRefresh) {
    if (cachedToken && cachedToken.expiresAt > now + JWT_SAFETY_BUFFER_MS) {
      return cachedToken.token;
    }
    if (email) {
      const edgeEntry = await readEdgeCachedToken(email, now);
      if (edgeEntry) {
        cachedToken = edgeEntry;
        return edgeEntry.token;
      }
    }
  } else {
    await clearCachedToken(email || undefined);
  }

  if (!email || !password) {
    throw new Error(
      "NOWPayments credentials (NOWPAYMENTS_EMAIL / NOWPAYMENTS_PASSWORD) are not configured."
    );
  }

  const authEndpoint = authProxyUrl || `${apiUrl}/auth`;
  const proxySecret = getEnv("NOWPAYMENTS_PROXY_SECRET");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (proxySecret && authProxyUrl) {
    headers["x-proxy-secret"] = proxySecret;
  }

  const res = await fetch(authEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      const detail = errText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
      const waitHint = retryAfter ? ` Retry-After: ${retryAfter}s.` : "";
      throw new Error(
        `NOWPayments auth rate-limited (429 Too Many Requests).${waitHint} Cloudflare Worker shared egress IPs are throttled by api.nowpayments.io/v1/auth${detail ? ` [${detail}]` : ""}. Configure NOWPAYMENTS_AUTH_PROXY_URL or NOWPAYMENTS_API_URL via a static non-Cloudflare relay to avoid Worker IP throttling.`
      );
    }
    throw new Error(`NOWPayments auth failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { token?: string };
  if (!data?.token) {
    throw new Error("NOWPayments auth response did not contain a JWT token.");
  }

  const expiresAt = parseJwtExpirationMs(data.token, now);
  cachedToken = {
    token: data.token,
    expiresAt,
  };
  await writeEdgeCachedToken(email, data.token, expiresAt);

  return data.token;
}

/**
 * Fetch custody balances from NOWPayments
 */
export async function getNowpaymentsBalance(): Promise<{
  balances: Record<string, { amount: number; pendingAmount: number }>;
  raw: any;
}> {
  const apiKey = getNowpaymentsApiKey();
  const apiUrl = getNowpaymentsApiUrl();

  if (!apiKey) {
    return {
      balances: {
        usdtmatic: { amount: 0.0, pendingAmount: 0 },
        matic: { amount: 0.0, pendingAmount: 0 },
      },
      raw: { simulated: true },
    };
  }

  try {
    const res = await fetch(`${apiUrl}/balance`, {
      headers: {
        "x-api-key": apiKey,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch balance: ${res.statusText}`);
    }

    const data = (await res.json()) as any;
    const normalized = data?.balances || data || {};
    return { balances: normalized, raw: data };
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
      const data = (await res.json()) as { tether?: { inr?: number } };
      if (data?.tether?.inr && typeof data.tether.inr === "number") {
        return Number(data.tether.inr.toFixed(2));
      }
    }
  } catch {
    console.warn("CoinGecko rate fetch failed, using fallback:", fallbackRate);
  }
  return fallbackRate;
}

/**
 * Create and execute Mass Payout via NOWPayments API
 * Includes automatic 2FA TOTP verification and 401 token refresh
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

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error(
      "Invalid EVM wallet address. Must be a 42-character address starting with 0x."
    );
  }

  const currencyTicker = network.toUpperCase() === "POLYGON" ? "usdtmatic" : "usdtbsc";

  const apiKey = getNowpaymentsApiKey();
  const email = getNowpaymentsEmail();
  const password = getNowpaymentsPassword();
  const apiUrl = getNowpaymentsApiUrl();
  const twoFaSecret = getNowpayments2faSecret();

  if (!apiKey || !email || !password) {
    console.log(
      `[NOWPayments SIMULATION] Processing payout of ${usdtAmount} USDT to ${walletAddress}`
    );
    return {
      success: true,
      batchId: "batch_sim_" + Date.now(),
      payoutId: "payout_sim_" + Date.now(),
      txHash: "0x" + crypto.randomBytes(32).toString("hex"),
      simulated: true,
    };
  }

  try {
    const callbackUrl = `${
      getEnv("NEXTAUTH_URL") || "https://earn.javnex.in"
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

    const submitPayout = async (authToken: string) =>
      fetch(`${apiUrl}/payout`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payoutPayload),
      });

    let token = await getNowpaymentsAuthToken();
    let payoutRes = await submitPayout(token);

    // Refresh JWT once cleanly if cached token expired before server clock check
    if (payoutRes.status === 401) {
      await payoutRes.body?.cancel().catch(() => {});
      token = await getNowpaymentsAuthToken(true);
      payoutRes = await submitPayout(token);
    }

    if (!payoutRes.ok) {
      const errText = await payoutRes.text();
      throw new Error(`NOWPayments payout creation failed (${payoutRes.status}): ${errText}`);
    }

    const payoutData = (await payoutRes.json()) as {
      id?: string | number;
      batch_withdrawal_id?: string | number;
      withdrawals?: Array<{ id?: string | number; hash?: string }>;
    };
    const batchId = payoutData.id || payoutData.batch_withdrawal_id;
    const item = payoutData.withdrawals?.[0];
    const payoutId = item?.id ? String(item.id) : undefined;

    if (twoFaSecret && batchId) {
      const totpCode = generateTOTP(twoFaSecret);

      const verifyRes = await fetch(`${apiUrl}/payout/${batchId}/verify`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verification_code: totpCode,
        }),
      });

      if (!verifyRes.ok) {
        console.warn("2FA TOTP verification warning:", await verifyRes.text());
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
  const ipnSecret = getNowpaymentsIpnSecret();
  if (!ipnSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "NOWPAYMENTS_IPN_SECRET is not configured in production. Rejecting IPN webhook for security."
      );
      return false;
    }
    return true;
  }

  const sortedKeys = Object.keys(payload).sort();
  const sortedObj: Record<string, any> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = payload[k];
  }

  const jsonString = JSON.stringify(sortedObj);
  const hmac = crypto
    .createHmac("sha512", ipnSecret)
    .update(jsonString)
    .digest("hex");

  return hmac === receivedSig;
}
