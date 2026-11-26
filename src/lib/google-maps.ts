import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

/**
 * Finds the Chrome or Chromium binary path on the host system.
 */
export function findChromePath(): string | null {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const c of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
  }
  return null;
}

/**
 * Extracts the 64-bit Hex Customer ID (CID) from a Google Maps URL.
 * Matches patterns like 0x3bc6551d89962067:0xb234a7d6a1f3ddd2 or !1s0x0:0xb234a7d6a1f3ddd2
 */
export function extractGoogleMapsCid(url: string): string | null {
  if (!url) return null;
  const pairMatch = url.match(/0x[0-9a-fA-F]+:(0x[0-9a-fA-F]+)/);
  if (pairMatch) return pairMatch[1].toLowerCase();

  const singleMatch = url.match(/!1s0x0:(0x[0-9a-fA-F]+)/);
  if (singleMatch) return singleMatch[1].toLowerCase();

  return null;
}

/**
 * Extracts the unique Google Review identifier from a resolved Google Maps review URL.
 * e.g. Ci9DQUlRQUNvZENodHljRjlvT21wWWFXZHVPWGRaWnpCWmNrbEJTbFV5UWtWTlptYxAB or rp_h:...
 */
export function extractGoogleReviewId(url: string): string | null {
  if (!url) return null;

  const b64Match = url.match(/!1s(Ci9[a-zA-Z0-9_-]+)/);
  if (b64Match) return b64Match[1];

  const rpHexMatch = url.match(/rp_h:[a-zA-Z0-9_-]+/);
  if (rpHexMatch) return rpHexMatch[0];

  return null;
}

/**
 * Follows shortlink redirects (e.g. https://maps.app.goo.gl/...) to get the final Google destination URL.
 */
export async function resolveGoogleMapsUrl(url: string): Promise<string> {
  const trimmed = url.trim();

  if (trimmed.includes("google.com/maps/reviews/") || trimmed.includes("google.com/maps/place/")) {
    return trimmed;
  }

  try {
    const { stdout } = await execAsync(`curl.exe -s -I "${trimmed}"`, {
      timeout: 6000,
    });
    const match = stdout.match(/location:\s*([^\r\n]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch {
    // fallback
  }

  return trimmed;
}

/**
 * Scrapes live Google Maps review DOM using headless Chromium.
 * Extracts:
 * - Reviewer Name (<button class="...fontTitleSmall... P9Vtnb">Name</button>)
 * - Review Text (<span class="wiI7pd">Review text</span>)
 * - Shop Name (<div class="daF0l">Shop Name</div>)
 */
export async function scrapeGoogleMapsLiveReview(reviewUrl: string): Promise<{
  success: boolean;
  shopName?: string;
  reviewerName?: string;
  reviewText?: string;
  error?: string;
}> {
  const chromePath = findChromePath();
  if (!chromePath) {
    return { success: false, error: "Headless Chrome/Edge browser not found on host" };
  }

  try {
    const cmd = `"${chromePath}" --headless=new --disable-gpu --virtual-time-budget=6000 --dump-dom "${reviewUrl}"`;
    const { stdout } = await execAsync(cmd, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 12000,
    });

    // 1. Extract Shop Name: <div class="daF0l">...</div>
    const shopMatch = stdout.match(/<div class="daF0l">([^<]+)<\/div>/);
    const shopName = shopMatch ? shopMatch[1].trim() : undefined;

    // 2. Extract Reviewer Name: <button class="...P9Vtnb...|fontTitleSmall">...</button>
    const reviewerMatch = stdout.match(
      /<button class="[^"]*(?:P9Vtnb|fontTitleSmall)[^"]*"[^>]*>([^<]+)<\/button>/
    );
    const reviewerName = reviewerMatch ? reviewerMatch[1].trim() : undefined;

    // 3. Extract Review Text: <span class="wiI7pd">...</span>
    const textMatch = stdout.match(/<span class="wiI7pd">([^<]+)<\/span>/);
    const reviewText = textMatch ? textMatch[1].trim() : undefined;

    return {
      success: Boolean(reviewerName || shopName || reviewText),
      shopName,
      reviewerName,
      reviewText,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Verifies if reviewer's name matches logged-in Google Account name.
 */
export function isReviewerNameMatch(expectedName: string, actualName: string): boolean {
  if (!expectedName || !actualName) return false;
  const exp = expectedName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const act = actualName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (exp === act || exp.includes(act) || act.includes(exp)) return true;

  // First name match (e.g. "Jayraj Thakur" vs "Jayraj")
  const expParts = expectedName.toLowerCase().split(/\s+/).filter(Boolean);
  const actParts = actualName.toLowerCase().split(/\s+/).filter(Boolean);
  if (expParts.length > 0 && actParts.length > 0) {
    if (expParts[0] === actParts[0]) return true;
  }

  return false;
}

/**
 * Verifies if review text on Google Maps matches the assigned AI review.
 */
export function isReviewTextMatch(expectedText?: string, actualText?: string): boolean {
  if (!expectedText || !actualText) return true;
  const normExp = expectedText
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normAct = actualText
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normExp === normAct || normAct.includes(normExp) || normExp.includes(normAct)) {
    return true;
  }

  // Overlap ratio check
  const expWords = normExp.split(" ").filter((w) => w.length > 3);
  if (expWords.length === 0) return true;
  const matchCount = expWords.filter((w) => normAct.includes(w)).length;
  const overlapRatio = matchCount / expWords.length;

  return overlapRatio >= 0.35;
}

/**
 * Validates whether a submitted review proof link belongs to the target shop.
 */
export async function verifyGoogleReviewMatch(params: {
  shopUrl: string;
  proofLink: string;
}): Promise<{
  valid: boolean;
  reason?: string;
  resolvedReviewUrl?: string;
  reviewId?: string;
}> {
  const { shopUrl, proofLink } = params;

  const isGoogleMapsTask =
    shopUrl.includes("google.com/maps") ||
    shopUrl.includes("maps.app.goo.gl") ||
    shopUrl.includes("goo.gl/maps");

  if (!isGoogleMapsTask) {
    return { valid: true };
  }

  const resolvedReviewUrl = await resolveGoogleMapsUrl(proofLink);

  const isActualReview =
    resolvedReviewUrl.includes("/maps/reviews/") ||
    resolvedReviewUrl.includes("reviews/data=") ||
    resolvedReviewUrl.includes("rp_h:");

  if (!isActualReview) {
    return {
      valid: false,
      reason:
        "The submitted link is not an individual review link. Please click 'Share' on your specific review, not the shop's main page.",
      resolvedReviewUrl,
    };
  }

  const shopCid = extractGoogleMapsCid(shopUrl);
  const reviewCid = extractGoogleMapsCid(resolvedReviewUrl);

  if (shopCid && reviewCid && shopCid !== reviewCid) {
    return {
      valid: false,
      reason:
        "This review link belongs to a different shop or business! You must submit a review for the specified shop only.",
      resolvedReviewUrl,
    };
  }

  const reviewId = extractGoogleReviewId(resolvedReviewUrl) || undefined;

  return {
    valid: true,
    resolvedReviewUrl,
    reviewId,
  };
}
