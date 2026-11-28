import { exec, execFile, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const CHROME_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

const UNAVAILABLE_REVIEW_ERROR =
  "Google Maps shows: 'This review is no longer available.' Google has suppressed or shadow-banned this review from public view (or it was deleted). Open the link in an Incognito tab to check: reviews must be publicly visible to earn rewards.";

export interface LiveReviewScrapeResult {
  success: boolean;
  shopName?: string;
  reviewerName?: string;
  reviewText?: string;
  starRating?: number;
  reviewId?: string;
  source?: string;
  isStructuralOnly?: boolean;
  isUnavailable?: boolean;
  error?: string;
}

/**
 * Finds the Chrome or Chromium binary path on local host environments.
 * Always returns null on serverless edge runtimes (e.g. Cloudflare Workers).
 */
export function findChromePath(): string | null {
  try {
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
  } catch {
    // Non-Node serverless runtimes
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
 * Supports Chd..., ChZ..., Ci9..., 2@1:..., and rp_h:... review tokens.
 */
export function extractGoogleReviewId(url: string): string | null {
  if (!url) return null;

  const tokenMatch = url.match(/!1s(C[a-zA-Z0-9_-]{12,})/);
  if (tokenMatch) return tokenMatch[1];

  const legacyPairMatch = url.match(/!1s(2@1:[^!?&]+)/);
  if (legacyPairMatch) return legacyPairMatch[1];

  const rpHexMatch = url.match(/rp_h:[a-zA-Z0-9_-]+/);
  if (rpHexMatch) return rpHexMatch[0];

  return null;
}

/**
 * Removes tracking parameters (such as g_st) without corrupting remaining query parameters.
 */
function stripTrackingParams(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    parsed.searchParams.delete("g_st");
    return parsed.toString();
  } catch {
    return trimmed.replace(/[?&]g_st=[^&]+/g, "");
  }
}

/**
 * Follows shortlink redirects (e.g. https://share.google/... or https://maps.app.goo.gl/...)
 * using native Web fetch() to get the final Google destination URL.
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
        "User-Agent": CHROME_USER_AGENT,
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

  // Fallback for local Node environments if curl.exe exists
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
    // ignore on non-Windows/serverless
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
 * Checks whether rendered Google Maps content indicates a suppressed/deleted review.
 */
export function isReviewUnavailableContent(content: string): boolean {
  if (!content) return false;
  const lower = content.toLowerCase();
  if (lower.includes("this review is no longer available") || lower.includes("review is unavailable")) {
    return true;
  }
  if (
    lower.includes("review not found") &&
    !content.includes("data-review-id") &&
    !content.includes("Photo of") &&
    !content.includes("P9Vtnb")
  ) {
    return true;
  }
  return false;
}

const INVALID_AUTHOR_LINES = new Set([
  "place details",
  "loading",
  "sign in",
  "unavailable",
  "collapse side panel",
  "collapse side",
  "like",
  "share",
  "follow",
  "following",
  "get app",
  "recents",
  "saved",
  "back",
  "search",
  "close",
  "menu",
  "...",
]);

function isUiChromeOrIconLine(line: string): boolean {
  if (!line) return true;
  // Material Symbols Private Use Area glyphs & whitespace only
  if (/^[\u{e000}-\u{f8ff}\s]+$/u.test(line)) return true;
  if (INVALID_AUTHOR_LINES.has(line.toLowerCase())) return true;
  if (/^local guide\b/i.test(line)) return true;
  if (/^\d+\s+reviews?\b/i.test(line)) return true;
  if (/^this review is no longer available/i.test(line)) return true;
  if (/^map data/i.test(line)) return true;
  return false;
}

const TIME_AGO_LINE_RE =
  /^(?:edited\s+)?(?:(?:\d+|a|an|one)\s+(?:second|minute|hour|day|week|month|year)s?\s+ago|just now)(?:\s+on\s+.*)?$/i;

const TEXT_STOP_LINE_RE =
  /^(?:|like||share|response from the owner\b|collapse side|sign in|unavailable|map data\b|service\s*:|rooms\s*:|location\s*:|food\s*:|atmosphere\s*:|highlights\s*:)/i;

/**
 * Parses rendered Google Maps text/markdown (e.g. from Jina Reader with X-Return-Format: text).
 * Note: intentionally avoids inferring star rating from Material Symbol star icons because
 * Google Maps renders 5 glyphs in all cases and encodes score purely via CSS colors/classes.
 */
export function extractReviewDataFromText(text: string): {
  reviewerName?: string;
  reviewText?: string;
  shopName?: string;
} {
  let reviewerName: string | undefined;
  let reviewText: string | undefined;
  let shopName: string | undefined;

  const mdPhotoMatch = text.match(/!\[(?:Image\s*\d*:\s*)?Photo of ([^\]]+)\]/i);
  if (mdPhotoMatch?.[1]) {
    reviewerName = mdPhotoMatch[1].trim();
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\u00a0/g, " ").trim());

  const placeDetailsIdx = lines.findIndex((l) => /^place details$/i.test(l));

  // Extract Shop Name and Reviewer Name around the "PLACE DETAILS" landmark
  if (placeDetailsIdx > 0) {
    // Nav rail ends at Get app / Recents / Saved / Search Google Maps
    let headerEndIdx = -1;
    for (let i = Math.max(0, placeDetailsIdx - 12); i < placeDetailsIdx; i++) {
      const lower = lines[i].toLowerCase();
      if (
        lower === "get app" ||
        lower === "recents" ||
        lower === "saved" ||
        lower.endsWith("get app") ||
        lower === "search google maps" ||
        lower === "close"
      ) {
        headerEndIdx = i;
      }
    }

    for (let i = headerEndIdx + 1; i < placeDetailsIdx; i++) {
      const candidate = lines[i];
      if (!candidate || /^!\[/.test(candidate) || isUiChromeOrIconLine(candidate)) continue;
      if (candidate.startsWith("* ")) continue;
      shopName = candidate;
      break;
    }

    // Author name appears right after PLACE DETAILS (skipping blanks/icons/avatar images)
    if (!reviewerName) {
      for (let i = placeDetailsIdx + 1; i < Math.min(lines.length, placeDetailsIdx + 10); i++) {
        const candidate = lines[i].replace(/^[\u{e000}-\u{f8ff}\s]+/u, "").trim();
        if (!candidate || /^!\[/.test(candidate)) continue;
        if (isUiChromeOrIconLine(candidate)) continue;
        if (TIME_AGO_LINE_RE.test(candidate)) break;
        // Confirm review context follows nearby (menu glyph , stars , or relative time)
        const windowSlice = lines.slice(i + 1, Math.min(lines.length, i + 12)).join("\n");
        if (
          windowSlice.includes("") ||
          windowSlice.includes("") ||
          /ago/i.test(windowSlice) ||
          /Local Guide/i.test(windowSlice)
        ) {
          reviewerName = candidate;
        }
        break;
      }
    }
  }

  // Extract review body starting right after the timestamp line (e.g. "Edited 2 hours ago")
  const timeIdx = lines.findIndex((l) => {
    const stripped = l.replace(/^[\u{e000}-\u{f8ff}\s]+/u, "").trim();
    return TIME_AGO_LINE_RE.test(stripped);
  });

  if (timeIdx >= 0) {
    const bodyLines: string[] = [];
    for (let i = timeIdx + 1; i < Math.min(lines.length, timeIdx + 30); i++) {
      const line = lines[i];
      if (!line) {
        if (bodyLines.length > 0) continue;
        continue;
      }
      if (TEXT_STOP_LINE_RE.test(line)) break;
      if (/^[\u{e000}-\u{f8ff}\s]+$/u.test(line)) continue;
      if (/^!\[/.test(line)) continue;
      if (/^New$/i.test(line) && bodyLines.length === 0) continue;
      bodyLines.push(line);
    }
    const joined = bodyLines.join(" ").trim();
    if (joined.length >= 2) {
      reviewText = joined;
    }
  }

  return {
    reviewerName: decodeHtmlEntities(reviewerName),
    reviewText: decodeHtmlEntities(reviewText),
    shopName: decodeHtmlEntities(shopName),
  };
}

/**
 * Extracts reviewer name, text, stars, and shop name from Google Maps HTML or rendered text/markdown.
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

  // 1. Reviewer Author Name (HTML DOM matchers)
  const ariaActionMatch = html.match(/aria-label="Actions for ([^"']+)'s review"/i);
  if (ariaActionMatch?.[1]) {
    reviewerName = ariaActionMatch[1].trim();
  }
  if (!reviewerName) {
    const btnMatch = html.match(
      /<button class="[^"]*(?:P9Vtnb|fontTitleSmall)[^"]*"[^>]*>([^<]+)<\/button>/
    );
    if (btnMatch?.[1]) {
      reviewerName = btnMatch[1].trim();
    }
  }
  if (!reviewerName) {
    const biiQbMatch = html.match(/<div class="biiQb">[\s\S]*?<button[^>]*>([^<]+)<\/button>/);
    if (biiQbMatch?.[1] && !biiQbMatch[1].includes("...")) {
      reviewerName = biiQbMatch[1].trim();
    }
  }
  if (!reviewerName) {
    const altMatch = html.match(/alt="Photo of ([^"]+)"/i);
    if (altMatch?.[1]) {
      reviewerName = altMatch[1].trim();
    }
  }
  if (!reviewerName) {
    const ariaPhotoMatch = html.match(/aria-label="Photo of ([^"]+)"/i);
    if (ariaPhotoMatch?.[1]) {
      reviewerName = ariaPhotoMatch[1].trim();
    }
  }

  // 2. Review Text (HTML DOM matchers - supports inline <br> tags cleanly)
  const rawHtmlTextMatch =
    html.match(/<span class="wiI7pd">([\s\S]*?)<\/span>/) ||
    html.match(/class="MyEned"[^>]*><span[^>]*>([\s\S]*?)<\/span>/);
  if (rawHtmlTextMatch?.[1]) {
    const stripped = rawHtmlTextMatch[1]
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped) {
      reviewText = decodeHtmlEntities(stripped);
    }
  }

  // 3. Star Rating (HTML DOM aria-label matchers)
  const starMatch =
    html.match(/<span class="kvMYJc"[^>]*aria-label="([1-5])\s*stars?"/i) ||
    html.match(/role="img"[^>]*aria-label="([1-5])\s*stars?"/i) ||
    html.match(/aria-label="(?:Rated\s*)?([1-5])\s*(?:stars?|\/5)/i) ||
    html.match(/aria-label="([1-5])\s*stars?"/i);
  if (starMatch?.[1]) {
    starRating = parseInt(starMatch[1], 10);
  }

  // 4. Shop Name (HTML DOM matchers)
  const shopMatch =
    html.match(/<div class="daF0l">([^<]+)<\/div>/) ||
    html.match(/<h1 class="[^"]*DUwDvf[^"]*"[^>]*>([^<]+)<\/h1>/);
  if (shopMatch?.[1]) {
    shopName = decodeHtmlEntities(shopMatch[1].trim());
  }

  // 5. Fallback to rendered text/markdown parser when HTML selectors are absent (e.g. Jina Reader output)
  if (!reviewerName || !reviewText || !shopName) {
    const textParsed = extractReviewDataFromText(html);
    if (!reviewerName && textParsed.reviewerName) reviewerName = textParsed.reviewerName;
    if (!reviewText && textParsed.reviewText) reviewText = textParsed.reviewText;
    if (!shopName && textParsed.shopName) shopName = textParsed.shopName;
  }

  if (reviewerName && isUiChromeOrIconLine(reviewerName)) {
    reviewerName = undefined;
  }

  return {
    reviewerName: decodeHtmlEntities(reviewerName),
    reviewText,
    starRating,
    shopName,
  };
}

/**
 * Local Node headless Chrome scraper using CDP event polling (stops immediately once author or unavailability renders).
 * Falls back to --dump-dom if CDP socket startup fails.
 */
async function scrapeWithLocalChrome(
  chromePath: string,
  targetUrl: string,
  fallbackReviewId: string | null
): Promise<LiveReviewScrapeResult | null> {
  const tmpProfile = path.join(
    os.tmpdir(),
    `ch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  );
  fs.mkdirSync(tmpProfile, { recursive: true });

  const proc = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--remote-debugging-port=0",
      "--no-first-run",
      "--no-default-browser-check",
      "--lang=en-US",
      `--user-data-dir=${tmpProfile}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let ws: WebSocket | null = null;
  try {
    // Wait for DevToolsActivePort to get assigned ephemeral port
    let port: string | null = null;
    const portFile = path.join(tmpProfile, "DevToolsActivePort");
    for (let i = 0; i < 25; i++) {
      if (fs.existsSync(portFile)) {
        const raw = fs.readFileSync(portFile, "utf8").trim();
        const firstLine = raw.split(/\r?\n/)[0]?.trim();
        if (firstLine && /^\d+$/.test(firstLine)) {
          port = firstLine;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    if (port && typeof WebSocket !== "undefined") {
      let pageWsUrl = "";
      for (let i = 0; i < 15; i++) {
        try {
          const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
          const targets: any[] = await listRes.json();
          const pageTarget = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl) || targets[0];
          if (pageTarget?.webSocketDebuggerUrl) {
            pageWsUrl = pageTarget.webSocketDebuggerUrl;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 150));
      }

      if (pageWsUrl) {
        ws = new WebSocket(pageWsUrl);
        let msgId = 1;
        const pending = new Map<number, (v: any) => void>();
        const send = (method: string, params: any = {}) =>
          new Promise<any>((resolve, reject) => {
            if (!ws) return reject(new Error("WebSocket closed"));
            const id = msgId++;
            const timer = setTimeout(() => {
              pending.delete(id);
              resolve(null);
            }, 5000);
            pending.set(id, (val) => {
              clearTimeout(timer);
              resolve(val);
            });
            ws.send(JSON.stringify({ id, method, params }));
          });

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("CDP connect timeout")), 4000);
          ws!.addEventListener("open", () => {
            clearTimeout(timer);
            resolve();
          });
          ws!.addEventListener("error", () => {
            clearTimeout(timer);
            reject(new Error("CDP socket error"));
          });
        });

        ws.addEventListener("message", (ev) => {
          try {
            const msg = JSON.parse(String(ev.data));
            if (msg.id && pending.has(msg.id)) {
              pending.get(msg.id)!(msg.result);
              pending.delete(msg.id);
            }
          } catch {}
        });

        await send("Page.enable");
        await send("Page.navigate", { url: targetUrl });

        let snap: {
          author?: string | null;
          star?: string | null;
          review?: string | null;
          shop?: string | null;
          reviewId?: string | null;
          unavail?: boolean;
        } | null = null;

        for (let i = 0; i < 32; i++) {
          await new Promise((r) => setTimeout(r, 400));
          const ev = await send("Runtime.evaluate", {
            expression: `(() => {
              const bodyText = document.body ? document.body.innerText : '';
              const unavail = bodyText.includes('This review is no longer available') || bodyText.includes('review is unavailable');
              const btn = document.querySelector('button.P9Vtnb, button.fontTitleSmall');
              const actionEl = document.querySelector('[aria-label*="Actions for"]');
              const photoEl = document.querySelector('img[alt*="Photo of"]');
              let author = btn ? btn.textContent.trim() : null;
              if (!author && actionEl) {
                const m = (actionEl.getAttribute('aria-label') || '').match(/Actions for ([^"']+)'s review/i);
                if (m) author = m[1].trim();
              }
              if (!author && photoEl) {
                const m = (photoEl.getAttribute('alt') || '').match(/Photo of (.+)/i);
                if (m) author = m[1].trim();
              }
              const starEl = document.querySelector('.kvMYJc, [role="img"][aria-label*="star"]');
              const star = starEl ? starEl.getAttribute('aria-label') : null;
              const revEl = document.querySelector('.wiI7pd, .MyEned span');
              const review = revEl ? revEl.textContent.trim() : null;
              const shopEl = document.querySelector('.daF0l, h1.DUwDvf');
              const shop = shopEl ? shopEl.textContent.trim() : null;
              const idEl = document.querySelector('[data-review-id]');
              const reviewId = idEl ? idEl.getAttribute('data-review-id') : null;
              return { author, star, review, shop, reviewId, unavail };
            })()`,
            returnByValue: true,
          });
          const val = ev?.result?.value;
          if (val && (val.author || val.unavail)) {
            if (!val.unavail && (!val.star || !val.review)) {
              await new Promise((r) => setTimeout(r, 350));
              const ev2 = await send("Runtime.evaluate", {
                expression: `({
                  author: document.querySelector('button.P9Vtnb, button.fontTitleSmall')?.textContent?.trim() || null,
                  star: document.querySelector('.kvMYJc, [role="img"][aria-label*="star"]')?.getAttribute('aria-label') || null,
                  review: document.querySelector('.wiI7pd, .MyEned span')?.textContent?.trim() || null,
                  shop: document.querySelector('.daF0l, h1.DUwDvf')?.textContent?.trim() || null,
                  reviewId: document.querySelector('[data-review-id]')?.getAttribute('data-review-id') || null,
                  unavail: false
                })`,
                returnByValue: true,
              });
              snap = ev2?.result?.value || val;
            } else {
              snap = val;
            }
            break;
          }
        }

        if (snap) {
          if (snap.unavail) {
            return {
              success: false,
              isUnavailable: true,
              shopName: snap.shop || undefined,
              source: "local-chrome-cdp",
              error: UNAVAILABLE_REVIEW_ERROR,
            };
          }
          const starMatch = snap.star?.match(/([1-5])/);
          const starRating = starMatch ? parseInt(starMatch[1], 10) : undefined;
          return {
            success: Boolean(snap.author || snap.shop || snap.review || starRating),
            shopName: decodeHtmlEntities(snap.shop || undefined),
            reviewerName: decodeHtmlEntities(snap.author || undefined),
            reviewText: decodeHtmlEntities(snap.review || undefined),
            starRating,
            reviewId: snap.reviewId || fallbackReviewId || undefined,
            source: "local-chrome-cdp",
          };
        }
      }
    }
  } catch (cdpErr) {
    console.warn("Local Chrome CDP warning:", cdpErr);
  } finally {
    try {
      ws?.close();
    } catch {}
    try {
      proc.kill();
    } catch {}
    try {
      fs.rmSync(tmpProfile, { recursive: true, force: true });
    } catch {}
  }

  // Secondary local fallback: --dump-dom with generous virtual time budget
  const dumpProfile = `${tmpProfile}-dump`;
  try {
    const { stdout } = await execFileAsync(
      chromePath,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${dumpProfile}`,
        "--virtual-time-budget=12000",
        "--dump-dom",
        targetUrl,
      ],
      {
        maxBuffer: 25 * 1024 * 1024,
        timeout: 20000,
      }
    );

    if (isReviewUnavailableContent(stdout)) {
      const parsed = extractReviewDataFromHtml(stdout);
      return {
        success: false,
        isUnavailable: true,
        shopName: parsed.shopName,
        source: "local-chrome-dump",
        error: UNAVAILABLE_REVIEW_ERROR,
      };
    }

    const parsed = extractReviewDataFromHtml(stdout);
    const reviewIdMatch = stdout.match(/data-review-id="([^"]+)"/);
    return {
      success: Boolean(parsed.reviewerName || parsed.shopName || parsed.reviewText || parsed.starRating),
      shopName: parsed.shopName,
      reviewerName: parsed.reviewerName,
      reviewText: parsed.reviewText,
      starRating: parsed.starRating,
      reviewId: (reviewIdMatch ? reviewIdMatch[1] : fallbackReviewId) || undefined,
      source: "local-chrome-dump",
    };
  } catch (dumpErr) {
    console.warn("Local Chrome dump warning:", dumpErr);
    return null;
  } finally {
    try {
      fs.rmSync(dumpProfile, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Cloudflare Workers Browser Rendering (@cloudflare/puppeteer via MYBROWSER binding).
 * Waits explicitly for Maps review JS hydration (not domcontentloaded) and guarantees browser.close().
 */
async function scrapeWithCloudflareBrowser(
  targetUrl: string,
  fallbackReviewId: string | null
): Promise<LiveReviewScrapeResult | null> {
  let cf: any = null;
  try {
    const cfSymbol = Symbol.for("__cloudflare-context__");
    cf = (globalThis as any)[cfSymbol];
    if (!cf?.env) {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      cf = await getCloudflareContext({ async: true }).catch(() => getCloudflareContext());
    }
  } catch {
    return null;
  }

  const browserBinding = cf?.env?.MYBROWSER;
  if (!browserBinding) return null;

  let browser: any = null;
  try {
    const puppeteer = (await import("@cloudflare/puppeteer")).default;
    browser = await puppeteer.launch(browserBinding);
    const page = await browser.newPage();

    await page.setUserAgent(CHROME_USER_AGENT);
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 11000 });

    // Handle Google EU cookie consent gate if Worker executes from an EU edge POP
    const currentUrl = page.url();
    if (currentUrl.includes("consent.google.com")) {
      try {
        await page.evaluate(() => {
          const btn = document.querySelector<HTMLButtonElement>(
            'button[aria-label*="Reject all"], button[aria-label*="Accept all"], form button[type="submit"]'
          );
          btn?.click();
        });
        await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 6000 }).catch(() => {});
      } catch {}
    }

    // Wait for Google Maps review card or unavailability notice to hydrate via client JS
    await page
      .waitForFunction(
        () => {
          const bodyText = document.body ? document.body.innerText : "";
          if (
            bodyText.includes("This review is no longer available") ||
            bodyText.includes("review is unavailable")
          ) {
            return true;
          }
          const authorBtn = document.querySelector("button.P9Vtnb, button.fontTitleSmall");
          if (authorBtn?.textContent?.trim()) return true;
          const actionEl = document.querySelector('[aria-label*="Actions for"]');
          if (actionEl) return true;
          const photoEl = document.querySelector('img[alt*="Photo of"]');
          if (photoEl) return true;
          return false;
        },
        { timeout: 11000, polling: 250 }
      )
      .catch(() => {});

    // Give star rating & review body a brief moment to settle after author button mounts
    await new Promise((r) => setTimeout(r, 300));

    const domEval = await page.evaluate(() => {
      const bodyText = document.body ? document.body.innerText : "";
      const unavail =
        bodyText.includes("This review is no longer available") ||
        bodyText.includes("review is unavailable");
      const btn = document.querySelector("button.P9Vtnb, button.fontTitleSmall");
      const starEl = document.querySelector('.kvMYJc, [role="img"][aria-label*="star"]');
      const revEl = document.querySelector(".wiI7pd, .MyEned span");
      const shopEl = document.querySelector(".daF0l, h1.DUwDvf");
      const idEl = document.querySelector("[data-review-id]");
      return {
        unavail,
        author: btn?.textContent?.trim() || undefined,
        starAria: starEl?.getAttribute("aria-label") || undefined,
        review: revEl?.textContent?.trim() || undefined,
        shop: shopEl?.textContent?.trim() || undefined,
        reviewId: idEl?.getAttribute("data-review-id") || undefined,
      };
    });

    if (domEval?.unavail) {
      return {
        success: false,
        isUnavailable: true,
        shopName: decodeHtmlEntities(domEval.shop),
        source: "cloudflare-mybrowser",
        error: UNAVAILABLE_REVIEW_ERROR,
      };
    }

    const html = await page.content();
    if (isReviewUnavailableContent(html)) {
      const parsed = extractReviewDataFromHtml(html);
      return {
        success: false,
        isUnavailable: true,
        shopName: parsed.shopName || decodeHtmlEntities(domEval?.shop),
        source: "cloudflare-mybrowser",
        error: UNAVAILABLE_REVIEW_ERROR,
      };
    }

    const parsed = extractReviewDataFromHtml(html);
    const evalStarMatch = domEval?.starAria?.match(/([1-5])/);
    const starRating =
      (evalStarMatch ? parseInt(evalStarMatch[1], 10) : undefined) || parsed.starRating;
    const reviewerName = decodeHtmlEntities(domEval?.author) || parsed.reviewerName;
    const reviewText = decodeHtmlEntities(domEval?.review) || parsed.reviewText;
    const shopName = decodeHtmlEntities(domEval?.shop) || parsed.shopName;

    if (reviewerName || shopName || reviewText || starRating) {
      return {
        success: Boolean(reviewerName || shopName || reviewText || starRating),
        shopName,
        reviewerName,
        reviewText,
        starRating,
        reviewId: domEval?.reviewId || fallbackReviewId || undefined,
        source: "cloudflare-mybrowser",
      };
    }
  } catch (cfPuppeteerErr) {
    console.warn("Cloudflare puppeteer execution warning:", cfPuppeteerErr);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return null;
}

/**
 * Fetches OpenGraph metadata (shop name and exact filled-star count ★).
 */
async function fetchOpenGraphMetadata(
  targetUrl: string
): Promise<{ shopName?: string; starRating?: number }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const ogRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!ogRes.ok) return {};
    const ogHtml = await ogRes.text();

    const ogTitleMatch =
      ogHtml.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
      ogHtml.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);

    const ogDescMatch =
      ogHtml.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
      ogHtml.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);

    let shopName: string | undefined;
    let starRating: number | undefined;

    if (ogTitleMatch?.[1]) {
      const cleanedTitle = decodeHtmlEntities(
        ogTitleMatch[1].replace(/^Google review of\s*/i, "").trim()
      );
      if (cleanedTitle && cleanedTitle.toLowerCase() !== "google maps") {
        shopName = cleanedTitle;
      }
    }

    if (ogDescMatch?.[1]) {
      const starCount = (ogDescMatch[1].match(/★/g) || []).length;
      if (starCount >= 1 && starCount <= 5) {
        starRating = starCount;
      }
    }

    return { shopName, starRating };
  } catch {
    return {};
  }
}

/**
 * Queries Jina Cloud Headless Reader waiting explicitly for Google Maps review JS hydration.
 * Uses X-Return-Format: text first (works reliably on Jina without requiring a paid API key),
 * falling back to Markdown mode (preserving ![Image: Photo of Author]) if needed.
 */
async function fetchJinaReviewSnapshot(
  candidateUrl: string,
  format: "text" | "markdown"
): Promise<{
  isUnavailable?: boolean;
  reviewerName?: string;
  reviewText?: string;
  shopName?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const headers: Record<string, string> = {
      "User-Agent": CHROME_USER_AGENT,
      "X-Wait-For-Selector": "button.P9Vtnb, button.fontTitleSmall, div.PbZDve",
      "X-Timeout": "15",
      "X-No-Cache": "true",
    };
    if (format === "text") {
      headers["X-Return-Format"] = "text";
    }

    const res = await fetch(`https://r.jina.ai/${candidateUrl}`, {
      signal: controller.signal,
      headers,
    });
    if (!res.ok) return {};

    const content = await res.text();
    if (isReviewUnavailableContent(content)) {
      const parsed = extractReviewDataFromText(content);
      return { isUnavailable: true, shopName: parsed.shopName };
    }

    const parsed = extractReviewDataFromText(content);
    return {
      reviewerName: parsed.reviewerName,
      reviewText: parsed.reviewText,
      shopName: parsed.shopName,
    };
  } catch (err) {
    console.warn(`Jina ${format} reader warning:`, err);
    return {};
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Scrapes live Google Maps review DOM using headless Chromium (local dev),
 * Cloudflare Browser Rendering (MYBROWSER), or Jina JS-rendered reader + OpenGraph stars.
 */
export async function scrapeGoogleMapsLiveReview(
  reviewUrl: string
): Promise<LiveReviewScrapeResult> {
  // First resolve any shortlink (e.g. share.google / maps.app.goo.gl / goo.gl/maps)
  const targetUrl = await resolveGoogleMapsUrl(reviewUrl);
  const reviewId = extractGoogleReviewId(targetUrl);

  let extractedShopName: string | undefined;
  let extractedStars: number | undefined;
  let extractedReviewerName: string | undefined;
  let extractedReviewText: string | undefined;
  let resolvedReviewId = reviewId || undefined;
  let source = "none";

  const chromePath = findChromePath();

  // 1. Local dev headless Chrome via CDP
  if (chromePath) {
    const localResult = await scrapeWithLocalChrome(chromePath, targetUrl, reviewId);
    if (localResult) {
      if (localResult.isUnavailable) return localResult;
      if (localResult.reviewerName && localResult.starRating) return localResult;
      extractedShopName = localResult.shopName;
      extractedStars = localResult.starRating;
      extractedReviewerName = localResult.reviewerName;
      extractedReviewText = localResult.reviewText;
      resolvedReviewId = localResult.reviewId || resolvedReviewId;
      source = localResult.source || "local-chrome";
    }
  } else {
    // 2. Cloudflare Workers Browser Rendering (MYBROWSER)
    const cfResult = await scrapeWithCloudflareBrowser(targetUrl, reviewId);
    if (cfResult) {
      if (cfResult.isUnavailable) return cfResult;
      if (cfResult.reviewerName && cfResult.starRating) return cfResult;
      extractedShopName = cfResult.shopName;
      extractedStars = cfResult.starRating;
      extractedReviewerName = cfResult.reviewerName;
      extractedReviewText = cfResult.reviewText;
      resolvedReviewId = cfResult.reviewId || resolvedReviewId;
      source = cfResult.source || "cloudflare-mybrowser";
    }
  }

  // 3. Serverless Fallback: Run OpenGraph (for exact stars & shopName) in parallel with
  //    Jina Headless Reader waiting on button.P9Vtnb / div.PbZDve (for reviewerName & reviewText)
  if (!extractedReviewerName || !extractedStars || !extractedReviewText || !extractedShopName) {
    const cleanReviewUrl = stripTrackingParams(reviewUrl);
    const readerCandidates =
      cleanReviewUrl && cleanReviewUrl !== targetUrl
        ? [cleanReviewUrl, targetUrl]
        : [targetUrl];

    const ogPromise =
      !extractedStars || !extractedShopName
        ? fetchOpenGraphMetadata(targetUrl)
        : Promise.resolve<{ shopName?: string; starRating?: number }>({});

    const jinaTask = async () => {
      if (extractedReviewerName && extractedReviewText) return {};
      for (const candidateUrl of readerCandidates) {
        const textRes = await fetchJinaReviewSnapshot(candidateUrl, "text");
        if (textRes.isUnavailable) return textRes;
        if (textRes.reviewerName) return textRes;

        const mdRes = await fetchJinaReviewSnapshot(candidateUrl, "markdown");
        if (mdRes.isUnavailable) return mdRes;
        if (mdRes.reviewerName) return mdRes;

        if (textRes.shopName || textRes.reviewText) {
          return {
            shopName: textRes.shopName || mdRes.shopName,
            reviewText: textRes.reviewText || mdRes.reviewText,
          };
        }
      }
      return {};
    };

    const [ogData, jinaData] = await Promise.all([ogPromise, jinaTask()]);

    if (jinaData.isUnavailable) {
      return {
        success: false,
        isUnavailable: true,
        shopName: jinaData.shopName || ogData.shopName || extractedShopName,
        reviewId: resolvedReviewId,
        source: "jina-unavailable",
        error: UNAVAILABLE_REVIEW_ERROR,
      };
    }

    if (!extractedReviewerName && jinaData.reviewerName) {
      extractedReviewerName = jinaData.reviewerName;
      source = source === "none" ? "jina-text" : `${source}+jina`;
    }
    if (!extractedReviewText && jinaData.reviewText) {
      extractedReviewText = jinaData.reviewText;
    }
    if (!extractedShopName && (jinaData.shopName || ogData.shopName)) {
      extractedShopName = jinaData.shopName || ogData.shopName;
    }
    if (!extractedStars && ogData.starRating) {
      extractedStars = ogData.starRating;
    }
  }

  return {
    success: Boolean(
      extractedShopName || extractedReviewerName || extractedStars || resolvedReviewId
    ),
    shopName: extractedShopName,
    reviewerName: extractedReviewerName,
    reviewText: extractedReviewText,
    starRating: extractedStars,
    reviewId: resolvedReviewId,
    source,
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
  if (match?.[1]) {
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
 * Requires exact match, legitimate Google Maps prefix truncation, or >= 70% keyword overlap.
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
    return {
      matches: normExp === normAct,
      reason: "Assigned text too short to verify.",
      score: normExp === normAct ? 1.0 : 0,
    };
  }

  const matchCount = expWords.filter((w) => normAct.includes(w)).length;
  const overlapRatio = matchCount / expWords.length;

  if (overlapRatio >= 0.7) {
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
