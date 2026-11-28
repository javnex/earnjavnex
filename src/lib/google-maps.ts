import { exec, execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

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
 * Decodes standard HTML entities commonly found in scraped Google Maps DOM strings.
 */
export function decodeHtmlEntities(str?: string): string | undefined {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
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
  const ariaActionMatch = html.match(/aria-label="Actions for ([^"']+)'s review"/i);
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
    const biiQbMatch = html.match(/<div class="biiQb">[\s\S]*?<button[^>]*>([^<]+)<\/button>/);
    if (biiQbMatch && biiQbMatch[1] && !biiQbMatch[1].includes("...")) {
      reviewerName = biiQbMatch[1].trim();
    }
  }
  if (!reviewerName) {
    const altMatch = html.match(/alt="Photo of ([^"]+)"/i);
    if (altMatch && altMatch[1]) {
      reviewerName = altMatch[1].trim();
    }
  }
  if (!reviewerName) {
    const ariaPhotoMatch = html.match(/aria-label="Photo of ([^"]+)"/i);
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
  if (!reviewerName) {
    const mdPhotoMatch = html.match(/!\[(?:Image\s*\d*:\s*)?Photo of ([^\]]+)\]/i);
    if (mdPhotoMatch && mdPhotoMatch[1]) {
      reviewerName = mdPhotoMatch[1].trim();
    }
  }

  // 2. Review Text
  const textMatch =
    html.match(/<span class="wiI7pd">([^<]+)<\/span>/) ||
    html.match(/class="MyEned"[^>]*><span[^>]*>([^<]+)<\/span>/);
  if (textMatch && textMatch[1]) {
    reviewText = decodeHtmlEntities(textMatch[1].trim());
  }
  if (!reviewText) {
    // Markdown format fallback (e.g. from Jina markdown output)
    const mdBodyMatch = html.match(
      /(?:minutes?|hours?|days?|weeks?|months?|years?)\s*ago\s*\n+([\s\S]*?)(?:\n\s*(?:|Like|Share|Collapse|Response|\*\*Rooms|\*\*Service|\*\*Location|$))/i
    );
    if (mdBodyMatch && mdBodyMatch[1] && mdBodyMatch[1].trim().length >= 5) {
      reviewText = decodeHtmlEntities(mdBodyMatch[1].trim());
    }
  }

  // 3. Star Rating
  const starMatch =
    html.match(/<span class="kvMYJc"[^>]*aria-label="([1-5])\s*stars?"/i) ||
    html.match(/role="img"[^>]*aria-label="([1-5])\s*stars?"/i) ||
    html.match(/aria-label="(?:Rated\s*)?([1-5])\s*(?:stars?|\/5)/i) ||
    html.match(/aria-label="([1-5])\s*stars?"/i);
  if (starMatch && starMatch[1]) {
    starRating = parseInt(starMatch[1], 10);
  }

  // 4. Shop Name
  const shopMatch =
    html.match(/<div class="daF0l">([^<]+)<\/div>/) ||
    html.match(/<h1 class="[^"]*DUwDvf[^"]*"[^>]*>([^<]+)<\/h1>/);
  if (shopMatch && shopMatch[1]) {
    shopName = decodeHtmlEntities(shopMatch[1].trim());
  }
  if (!shopName) {
    // Markdown lines fallback
    const lines = html.split("\n").map((l) => l.trim()).filter(Boolean);
    const placeIdx = lines.findIndex((l) => l.toLowerCase() === "place details");
    if (placeIdx > 0) {
      shopName = lines[placeIdx - 3] || lines[placeIdx - 2];
    }
  }

  return {
    reviewerName: decodeHtmlEntities(reviewerName),
    reviewText,
    starRating,
    shopName,
  };
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
  isUnavailable?: boolean;
  error?: string;
}> {
  // First resolve any shortlink (e.g. share.google / maps.app.goo.gl)
  const targetUrl = await resolveGoogleMapsUrl(reviewUrl);
  const reviewId = extractGoogleReviewId(targetUrl);

  const chromePath = findChromePath();
  if (chromePath) {
    const tmpProfile = path.join(
      os.tmpdir(),
      `ch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    );
    try {
      const { stdout } = await execFileAsync(
        chromePath,
        [
          "--headless=new",
          "--disable-gpu",
          "--no-first-run",
          "--no-default-browser-check",
          `--user-data-dir=${tmpProfile}`,
          "--virtual-time-budget=7000",
          "--dump-dom",
          targetUrl,
        ],
        {
          maxBuffer: 25 * 1024 * 1024,
          timeout: 16000,
        }
      );
      console.log("[DEBUG] chrome stdout length:", stdout.length);

      if (
        stdout.includes("This review is no longer available") ||
        stdout.includes("review is unavailable") ||
        (stdout.includes("Review not found") && !stdout.includes("aria-label"))
      ) {
        const parsed = extractReviewDataFromHtml(stdout);
        return {
          success: false,
          isUnavailable: true,
          shopName: parsed.shopName,
          error:
            "Google Maps shows: 'This review is no longer available.' Google has suppressed or shadow-banned this review from public view (or it was deleted). Open the link in an Incognito tab to check: reviews must be publicly visible to earn rewards.",
        };
      }

      const parsed = extractReviewDataFromHtml(stdout);
      const reviewIdMatch = stdout.match(/data-review-id="([^"]+)"/);
      const extractedId = reviewIdMatch ? reviewIdMatch[1] : reviewId;

      return {
        success: Boolean(parsed.reviewerName || parsed.shopName || parsed.reviewText || parsed.starRating),
        shopName: parsed.shopName,
        reviewerName: parsed.reviewerName,
        reviewText: parsed.reviewText,
        starRating: parsed.starRating,
        reviewId: extractedId || undefined,
      };
    } catch (err: any) {
      console.warn("Headless chrome dump error:", err);
    }
  }

  // Cloud / Serverless Headless Inspection (Cloudflare Workers & Vercel)
  let extractedShopName: string | undefined = undefined;
  let extractedStars: number | undefined = undefined;
  let extractedReviewerName: string | undefined = undefined;
  let extractedReviewText: string | undefined = undefined;

  // Cloudflare Workers with Browser Rendering (@cloudflare/puppeteer)
  if (!chromePath) {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const cf = getCloudflareContext();
      if (cf?.env && (cf.env as any).MYBROWSER) {
        const puppeteer = (await import("@cloudflare/puppeteer")).default;
        const browser = await puppeteer.launch((cf.env as any).MYBROWSER);
        const page = await browser.newPage();
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 10000 });
        const html = await page.content();
        await browser.close();

        if (
          html.includes("This review is no longer available") ||
          html.includes("review is unavailable") ||
          (html.includes("Review not found") && !html.includes("data-review-id") && !html.includes("Photo of"))
        ) {
          return {
            success: false,
            isUnavailable: true,
            error:
              "Google Maps shows: 'This review is no longer available.' Google has suppressed or shadow-banned this review from public view (or it was deleted). Open the link in an Incognito tab to check: reviews must be publicly visible to earn rewards.",
          };
        }

        const parsed = extractReviewDataFromHtml(html);
        if (parsed.reviewerName) {
          return {
            success: true,
            shopName: parsed.shopName,
            reviewerName: parsed.reviewerName,
            reviewText: parsed.reviewText,
            starRating: parsed.starRating,
            reviewId: reviewId || undefined,
          };
        }
      }
    } catch (cfPuppeteerErr) {
      console.warn("Cloudflare puppeteer execution warning:", cfPuppeteerErr);
    }
  }

  // 1. Cloud Headless Reader (Jina Reader via shortlink)
  // Fetching via the original shortlink (reviewUrl) allows Jina to bypass Google Maps botguard blocks.
  const cleanReviewUrl = reviewUrl.trim().replace(/[?&]g_st=[^&]+/g, "");
  const readerCandidates = [cleanReviewUrl, targetUrl];

  for (const candidateUrl of readerCandidates) {
    if (extractedReviewerName) break;
    try {
      const jinaController = new AbortController();
      const jinaTimeout = setTimeout(() => jinaController.abort(), 12000);

      const jinaRes = await fetch(`https://r.jina.ai/${candidateUrl}`, {
        signal: jinaController.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
          "X-Return-Format": "html",
        },
      });
      clearTimeout(jinaTimeout);

      if (jinaRes.ok) {
        const fullContent = await jinaRes.text();
        if (
          fullContent.includes("This review is no longer available") ||
          fullContent.includes("review is unavailable") ||
          (fullContent.includes("Review not found") &&
            !fullContent.includes("Photo of") &&
            !fullContent.includes("data-review-id"))
        ) {
          return {
            success: false,
            isUnavailable: true,
            shopName: extractedShopName,
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
    } catch (jinaErr) {
      console.warn("Jina HTML reader fetch error:", jinaErr);
    }

    // Markdown fallback if HTML format did not yield reviewerName
    if (!extractedReviewerName) {
      try {
        const jinaMdRes = await fetch(`https://r.jina.ai/${candidateUrl}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
          },
        });
        if (jinaMdRes.ok) {
          const mdContent = await jinaMdRes.text();
          const mdData = extractReviewDataFromHtml(mdContent);
          if (mdData.reviewerName) extractedReviewerName = mdData.reviewerName;
          if (mdData.reviewText && !extractedReviewText) extractedReviewText = mdData.reviewText;
          if (mdData.starRating && !extractedStars) extractedStars = mdData.starRating;
          if (mdData.shopName && !extractedShopName) extractedShopName = mdData.shopName;
        }
      } catch {}
    }
  }

  // 2. OpenGraph metadata fallback (for shopName and star rating)
  if (!extractedShopName || !extractedStars) {
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

      if (ogTitleMatch && ogTitleMatch[1] && !extractedShopName) {
        extractedShopName = decodeHtmlEntities(
          ogTitleMatch[1].replace(/^Google review of\s*/i, "").trim()
        );
      }

      if (ogDescMatch && ogDescMatch[1] && !extractedStars) {
        const starCount = (ogDescMatch[1].match(/★/g) || []).length;
        if (starCount >= 1 && starCount <= 5) {
          extractedStars = starCount;
        }
      }
    } catch {}
  }

  return {
    success: Boolean(extractedShopName || extractedReviewerName || extractedStars || reviewId),
    shopName: extractedShopName,
    reviewerName: extractedReviewerName,
    reviewText: extractedReviewText,
    starRating: extractedStars,
    reviewId: reviewId || undefined,
  };
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

  const normExp = (decodeHtmlEntities(expectedText) || expectedText)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normAct = (decodeHtmlEntities(actualText) || actualText)
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
