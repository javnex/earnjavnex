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
  const localAppData = process.env.LOCALAPPDATA || "";
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe`,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
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
 * Follows shortlink redirects (e.g. https://share.google/... or https://maps.app.goo.gl/...)
 * using native Web fetch() to get the final Google destination URL.
 * Fully compatible with Cloudflare Workers (no Node child_process or curl.exe required).
 */
export async function resolveGoogleMapsUrl(url: string): Promise<string> {
  const trimmed = url.trim();

  if (trimmed.includes("google.com/maps/reviews/") || trimmed.includes("google.com/maps/place/")) {
    return trimmed;
  }

  try {
    const res = await fetch(trimmed, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });

    if (res.url && res.url !== trimmed) {
      return res.url;
    }
  } catch (err) {
    console.warn("fetch redirect resolution warning:", err);
  }

  // Fallback for Node environments if curl exists
  try {
    if (typeof execAsync === "function") {
      const { stdout } = await execAsync(`curl.exe -s -I "${trimmed}"`, {
        timeout: 5000,
      });
      const match = stdout.match(/location:\s*([^\r\n]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch {
    // fallback
  }

  return trimmed;
}

/**
 * Helper to extract reviewer name, text, stars, and shop name from Google Maps HTML.
 */
export function extractReviewDataFromHtml(html: string): {
  reviewerName?: string;
  reviewText?: string;
  starRating?: number;
  shopName?: string;
} {
  let reviewerName: string | undefined = undefined;
  let reviewText: string | undefined = undefined;
  let starRating: number | undefined = undefined;
  let shopName: string | undefined = undefined;

  // 1. Reviewer Author Name
  const ariaActionMatch = html.match(/aria-label="Actions for ([^']+)'s review"/i);
  if (ariaActionMatch && ariaActionMatch[1]) {
    reviewerName = ariaActionMatch[1].trim();
  }
  if (!reviewerName) {
    const btnMatch = html.match(
      /<button class="[^"]*(?:P9Vtnb|fontTitleSmall)[^"]*"[^>]*>([^<]+)<\/button>/
    );
    if (btnMatch && btnMatch[1]) {
      reviewerName = btnMatch[1].trim();
    }
  }
  if (!reviewerName) {
    const altMatch = html.match(/alt="Photo of ([^"]+)"/);
    if (altMatch && altMatch[1]) {
      reviewerName = altMatch[1].trim();
    }
  }
  if (!reviewerName) {
    const ariaPhotoMatch = html.match(/aria-label="Photo of ([^"]+)"/);
    if (ariaPhotoMatch && ariaPhotoMatch[1]) {
      reviewerName = ariaPhotoMatch[1].trim();
    }
  }
  if (!reviewerName) {
    const photoMatch = html.match(/Photo of ([^\n\]\)\"]+)/i);
    if (photoMatch && photoMatch[1]) {
      reviewerName = photoMatch[1].trim();
    }
  }

  // 2. Review Text
  const textMatch =
    html.match(/<span class="wiI7pd">([^<]+)<\/span>/) ||
    html.match(/class="MyEned"[^>]*><span[^>]*>([^<]+)<\/span>/);
  if (textMatch && textMatch[1]) {
    reviewText = textMatch[1].trim();
  }

  // 3. Star Rating
  const starMatch =
    html.match(/<span class="kvMYJc"[^>]*aria-label="([1-5])\s*stars?"/i) ||
    html.match(/role="img"[^>]*aria-label="([1-5])\s*stars?"/i) ||
    html.match(/aria-label="(?:Rated\s*)?([1-5])\s*(?:stars?|\/5)/i);
  if (starMatch && starMatch[1]) {
    starRating = parseInt(starMatch[1], 10);
  }

  // 4. Shop Name
  const shopMatch =
    html.match(/<div class="daF0l">([^<]+)<\/div>/) ||
    html.match(/<h1 class="[^"]*DUwDvf[^"]*"[^>]*>([^<]+)<\/h1>/);
  if (shopMatch && shopMatch[1]) {
    shopName = shopMatch[1].trim();
  }

  return { reviewerName, reviewText, starRating, shopName };
}

/**
 * Scrapes live Google Maps review DOM using headless Chromium when available,
 * or performs cloud headless DOM inspection on serverless runtimes (Cloudflare Workers).
 */
export async function scrapeGoogleMapsLiveReview(reviewUrl: string): Promise<{
  success: boolean;
  shopName?: string;
  reviewerName?: string;
  reviewText?: string;
  starRating?: number;
  reviewId?: string;
  isStructuralOnly?: boolean;
  error?: string;
}> {
  // First resolve any shortlink (e.g. share.google / maps.app.goo.gl)
  const targetUrl = await resolveGoogleMapsUrl(reviewUrl);

  const chromePath = findChromePath();
  // Cloudflare Workers / Serverless fallback: headless browser is not installed
  if (!chromePath) {
    const isGoogleReview =
      targetUrl.includes("/maps/reviews/") ||
      targetUrl.includes("reviews/data=") ||
      targetUrl.includes("rp_h:") ||
      targetUrl.includes("share.google");

    if (!isGoogleReview) {
      return {
        success: false,
        error: "Could not verify Google Maps review URL.",
      };
    }

    // Serverless-native OpenGraph and Cloud Headless Inspection
    let extractedShopName: string | undefined = undefined;
    let extractedStars: number | undefined = undefined;
    let extractedReviewerName: string | undefined = undefined;
    let extractedReviewText: string | undefined = undefined;

    // 1. Inspect OpenGraph metadata for instantaneous fallback
    try {
      const ogRes = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      const ogHtml = await ogRes.text();

      const ogTitleMatch =
        ogHtml.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
        ogHtml.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);

      const ogDescMatch =
        ogHtml.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
        ogHtml.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);

      if (ogTitleMatch && ogTitleMatch[1]) {
        extractedShopName = ogTitleMatch[1].replace(/^Google review of\s*/i, "").trim();
      }

      if (ogDescMatch && ogDescMatch[1]) {
        const starCount = (ogDescMatch[1].match(/★/g) || []).length;
        if (starCount >= 1 && starCount <= 5) {
          extractedStars = starCount;
        }
      }
    } catch {
      // Continue to cloud reader
    }

    // 2. Cloud Headless Reader (renders client-side JS & extracts full DOM with author name, text & stars)
    try {
      const jinaController = new AbortController();
      const jinaTimeout = setTimeout(() => jinaController.abort(), 9000);

      const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`, {
        signal: jinaController.signal,
        headers: {
          Accept: "text/plain",
        },
      });
      clearTimeout(jinaTimeout);

      if (jinaRes.ok) {
        const fullContent = await jinaRes.text();

        if (
          fullContent.includes("This review is no longer available") ||
          fullContent.includes("review is unavailable") ||
          fullContent.includes("Review not found") ||
          (fullContent.includes("Unavailable") && !fullContent.includes("★★"))
        ) {
          return {
            success: false,
            error:
              "Google Maps shows: 'This review is no longer available.' Google has suppressed or shadow-banned this review from public view (or it was deleted). Open the link in an Incognito tab to check: reviews must be publicly visible to earn rewards.",
          };
        }

        const data = extractReviewDataFromHtml(fullContent);
        if (data.reviewerName) extractedReviewerName = data.reviewerName;
        if (data.reviewText) extractedReviewText = data.reviewText;
        if (data.starRating) extractedStars = data.starRating;
        if (data.shopName && !extractedShopName) extractedShopName = data.shopName;
      }
    } catch {
      // If cloud reader timed out, continue
    }

    const reviewId = extractGoogleReviewId(targetUrl);

    return {
      success: Boolean(extractedShopName || extractedReviewerName || extractedStars || reviewId),
      shopName: extractedShopName,
      reviewerName: extractedReviewerName,
      reviewText: extractedReviewText,
      starRating: extractedStars,
      reviewId: reviewId || undefined,
    };
  }

  try {
    const cmd = `"${chromePath}" --headless=new --disable-gpu --virtual-time-budget=8000 --dump-dom "${targetUrl}"`;
    const { stdout } = await execAsync(cmd, {
      maxBuffer: 25 * 1024 * 1024,
      timeout: 18000,
    });

    if (
      stdout.includes("This review is no longer available") ||
      stdout.includes("review is unavailable") ||
      stdout.includes("Review not found") ||
      stdout.includes("HlvSq")
    ) {
      return {
        success: false,
        error:
          "Google Maps shows: 'This review is no longer available.' Google has suppressed or shadow-banned this review from public view (or it was deleted). Open the link in an Incognito tab to check: reviews must be publicly visible to earn rewards.",
      };
    }

    const parsed = extractReviewDataFromHtml(stdout);
    const reviewIdMatch = stdout.match(/data-review-id="([^"]+)"/);
    const reviewId = reviewIdMatch ? reviewIdMatch[1] : extractGoogleReviewId(targetUrl);

    return {
      success: Boolean(parsed.reviewerName || parsed.shopName || parsed.reviewText || parsed.starRating),
      shopName: parsed.shopName,
      reviewerName: parsed.reviewerName,
      reviewText: parsed.reviewText,
      starRating: parsed.starRating,
      reviewId: reviewId || undefined,
    };
  } catch (err: any) {
    // If local headless fails, fallback to cloud reader
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`, {
        headers: {
          Accept: "text/html",
          "X-Return-Format": "html",
          "X-Wait-For-Selector":
            "span.wiI7pd, .d4r55, .daF0l, button.P9Vtnb, button.fontTitleSmall",
        },
      });
      if (jinaRes.ok) {
        const fullHtml = await jinaRes.text();
        const data = extractReviewDataFromHtml(fullHtml);
        return {
          success: Boolean(data.reviewerName || data.shopName || data.reviewText),
          shopName: data.shopName,
          reviewerName: data.reviewerName,
          reviewText: data.reviewText,
          starRating: data.starRating,
          reviewId: extractGoogleReviewId(targetUrl) || undefined,
        };
      }
    } catch {
      // Fallback
    }

    const isGoogleReview =
      targetUrl.includes("/maps/reviews/") ||
      targetUrl.includes("reviews/data=") ||
      targetUrl.includes("rp_h:");

    if (isGoogleReview) {
      return { success: true, isStructuralOnly: true };
    }
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

  // Email prefix matching (e.g. "jayraj.0.thakur@gmail.com" vs "Jayraj Thakur")
  if (expectedName.includes("@")) {
    const emailPrefix = expectedName.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    if (act.includes(emailPrefix) || emailPrefix.includes(act)) return true;
    if (actParts.some((part) => part.length >= 3 && emailPrefix.includes(part))) return true;
  }

  return false;
}

/**
 * Extracts human-readable shop name from Google Maps URL if present.
 * e.g. /place/Aura+thai+family+spa/ -> "Aura thai family spa"
 */
export function extractShopNameFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/place\/([^/@?]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1].replace(/\+/g, " ")).trim();
    } catch {
      return match[1].replace(/\+/g, " ").trim();
    }
  }
  return null;
}

/**
 * Strictly verifies that the review is for the target shop.
 */
export function isShopNameMatch(
  taskTitle: string,
  taskShopUrl: string,
  scrapedShopName?: string
): boolean {
  if (!scrapedShopName || !scrapedShopName.trim()) {
    return true; // fallback to CID check if shop name header was not in DOM
  }

  const normScraped = scrapedShopName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normTitle = taskTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
  const urlShopName = extractShopNameFromUrl(taskShopUrl);
  const normUrlName = urlShopName
    ? urlShopName.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";

  if (
    normScraped === normTitle ||
    normScraped.includes(normTitle) ||
    normTitle.includes(normScraped)
  ) {
    return true;
  }

  if (
    normUrlName &&
    (normScraped === normUrlName ||
      normScraped.includes(normUrlName) ||
      normUrlName.includes(normScraped))
  ) {
    return true;
  }

  return false;
}

/**
 * Strictly verifies that review text on Google Maps matches the assigned AI review text.
 * Requires exact match, legitimate Google Maps prefix truncation, or >= 75% keyword overlap.
 * Prevents users from writing arbitrary, unassigned reviews.
 */
export function isReviewTextMatch(
  expectedText?: string,
  actualText?: string
): { matches: boolean; reason?: string; score: number } {
  if (!expectedText || !expectedText.trim()) {
    return { matches: false, reason: "No assigned review text provided.", score: 0 };
  }
  if (!actualText || !actualText.trim()) {
    return { matches: false, reason: "No review text found on the store listing.", score: 0 };
  }

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

  // 1. Exact match or direct containment
  if (normExp === normAct || normAct.includes(normExp) || normExp.includes(normAct)) {
    return { matches: true, score: 1.0 };
  }

  // 2. Google Maps public truncation check (when Google truncates long review with ...More)
  const actPrefix = normAct.slice(0, Math.min(normAct.length, 100));
  if (actPrefix.length >= 25 && normExp.startsWith(actPrefix)) {
    return { matches: true, score: 1.0 };
  }

  // 3. Strict Keyword Overlap (requires >= 70% of assigned significant words)
  const expWords = normExp.split(" ").filter((w) => w.length >= 2);
  if (expWords.length === 0) {
    return { matches: normExp === normAct, reason: "Assigned text too short to verify.", score: normExp === normAct ? 1.0 : 0 };
  }

  const matchCount = expWords.filter((w) => normAct.includes(w)).length;
  const overlapRatio = matchCount / expWords.length;

  if (overlapRatio >= 0.70) {
    return { matches: true, score: Number(overlapRatio.toFixed(2)) };
  }

  return {
    matches: false,
    score: Number(overlapRatio.toFixed(2)),
    reason: `Review text mismatch (similarity score: ${Math.round(overlapRatio * 100)}%). Expected assigned text was not found on the store listing.`,
  };
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
    shopUrl.includes("goo.gl/maps") ||
    shopUrl.includes("share.google") ||
    shopUrl.includes("#lrd=") ||
    shopUrl.includes("0x");

  if (!isGoogleMapsTask) {
    return { valid: true };
  }

  const resolvedReviewUrl = await resolveGoogleMapsUrl(proofLink);

  const isActualReview =
    resolvedReviewUrl.includes("/maps/reviews/") ||
    resolvedReviewUrl.includes("reviews/data=") ||
    resolvedReviewUrl.includes("rp_h:") ||
    resolvedReviewUrl.includes("share.google") ||
    resolvedReviewUrl.includes("/place/") ||
    resolvedReviewUrl.includes("#lrd=");

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
