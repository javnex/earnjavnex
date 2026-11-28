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
  diagnostics?: string[];
  isStructuralOnly?: boolean;
  isUnavailable?: boolean;
  error?: string;
}

interface PartialScrapeState {
  shopName?: string;
  reviewerName?: string;
  reviewText?: string;
  starRating?: number;
  reviewId?: string;
  sources: string[];
  diagnostics: string[];
}

function isCloudflareWorker(): boolean {
  return (
    typeof (globalThis as any).WebSocketPair !== "undefined" ||
    (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers")
  );
}

function isNodeRuntime(): boolean {
  return (
    !isCloudflareWorker() &&
    typeof process !== "undefined" &&
    Boolean(process.versions?.node)
  );
}

async function loadNodeModules() {
  if (!isNodeRuntime()) return null;
  try {
    const [fsMod, osMod, pathMod, cpMod, utilMod] = await Promise.all([
      import("node:fs"),
      import("node:os"),
      import("node:path"),
      import("node:child_process"),
      import("node:util"),
    ]);
    return {
      fs: fsMod.default ?? fsMod,
      os: osMod.default ?? osMod,
      path: pathMod.default ?? pathMod,
      spawn: cpMod.spawn,
      execAsync: utilMod.promisify(cpMod.exec),
      execFileAsync: utilMod.promisify(cpMod.execFile),
    };
  } catch {
    return null;
  }
}

async function getCloudflareEnv(): Promise<Record<string, any> | undefined> {
  try {
    const cfSymbol = Symbol.for("__cloudflare-context__");
    const globalCf = (globalThis as any)[cfSymbol];
    if (globalCf?.env) return globalCf.env;

    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true }).catch(() => getCloudflareContext());
    return (ctx as any)?.env;
  } catch {
    return undefined;
  }
}

async function getRuntimeSecret(key: string): Promise<string | undefined> {
  const cfEnv = await getCloudflareEnv();
  const cfVal = cfEnv?.[key];
  if (typeof cfVal === "string" && cfVal.trim()) return cfVal.trim();

  if (typeof process !== "undefined" && process.env?.[key]) {
    const val = process.env[key];
    if (val && val.trim()) return val.trim();
  }
  return undefined;
}

/**
 * Finds the Chrome or Chromium binary path on local host environments.
 * Always returns null on serverless edge runtimes (e.g. Cloudflare Workers).
 */
export async function findChromePath(): Promise<string | null> {
  const nodeMods = await loadNodeModules();
  if (!nodeMods) return null;

  try {
    const { fs } = nodeMods;
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
      return process.env.CHROME_PATH;
    }
    const localAppData = process.env.LOCALAPPDATA || "";
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      localAppData ? `${localAppData}\\Google\\Chrome\\Application\\chrome.exe` : "",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      localAppData ? `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe` : "",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    ];
    for (const candidate of candidates) {
      if (candidate && fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
        return candidate;
      }
    }
  } catch {
    // Non-Node runtimes
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
  const nodeMods = await loadNodeModules();
  if (nodeMods) {
    try {
      const { stdout } = await nodeMods.execFileAsync("curl.exe", ["-s", "-I", trimmed], {
        timeout: 5000,
      });
      const match = stdout.match(/location:\s*([^\r\n]+)/i);
      if (match?.[1]) {
        return match[1].trim();
      }
    } catch {
      // ignore on non-Windows/serverless
    }
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

function detectGoogleInterstitial(content: string, url?: string): "captcha" | "consent" | null {
  const lowerUrl = (url || "").toLowerCase();
  if (lowerUrl.includes("/sorry/")) return "captcha";
  if (lowerUrl.includes("consent.google.com")) return "consent";

  const lower = content.toLowerCase();
  if (
    lower.includes("unusual traffic from your computer network") ||
    lower.includes("our systems have detected unusual traffic") ||
    lower.includes("g-recaptcha") ||
    lower.includes("/sorry/image")
  ) {
    return "captcha";
  }
  if (
    lower.includes("before you continue to google") &&
    !content.includes("P9Vtnb") &&
    !content.includes("PLACE DETAILS")
  ) {
    return "consent";
  }
  return null;
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
  "⋯",
]);

function isUiChromeOrIconLine(line: string): boolean {
  if (!line) return true;
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

    if (!reviewerName) {
      for (let i = placeDetailsIdx + 1; i < Math.min(lines.length, placeDetailsIdx + 12); i++) {
        const candidate = lines[i].replace(/^[\u{e000}-\u{f8ff}\s]+/u, "").trim();
        if (!candidate || /^!\[/.test(candidate)) continue;
        if (isUiChromeOrIconLine(candidate)) continue;
        if (TIME_AGO_LINE_RE.test(candidate)) break;

        const windowSlice = lines.slice(i + 1, Math.min(lines.length, i + 12)).join("\n");
        if (
          windowSlice.includes("") ||
          windowSlice.includes("") ||
          /\b(?:ago|just now)\b/i.test(windowSlice) ||
          /Local Guide/i.test(windowSlice)
        ) {
          reviewerName = candidate;
        }
        break;
      }
    }
  }

  const timeIdx = lines.findIndex((l) => {
    const stripped = l.replace(/^[\u{e000}-\u{f8ff}\s]+/u, "").trim();
    return TIME_AGO_LINE_RE.test(stripped);
  });

  if (timeIdx >= 0) {
    const bodyLines: string[] = [];
    for (let i = timeIdx + 1; i < Math.min(lines.length, timeIdx + 30); i++) {
      const line = lines[i];
      if (!line) continue;
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
  let reviewerName: string | undefined;
  let reviewText: string | undefined;
  let starRating: number | undefined;
  let shopName: string | undefined;

  // 1. Reviewer Author Name (HTML DOM matchers)
  const ariaActionMatch = html.match(/aria-label="Actions for ([^"]+?)(?:['’]s|s['’])\s+review"/i);
  if (ariaActionMatch?.[1]) {
    reviewerName = ariaActionMatch[1].trim();
  }

  if (!reviewerName) {
    const btnRegex = /<button[^>]*class="[^"]*(?:P9Vtnb|fontTitleSmall)[^"]*"[^>]*>([\s\S]*?)<\/button>/gi;
    let m: RegExpExecArray | null;
    while ((m = btnRegex.exec(html)) !== null) {
      const cleaned = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (cleaned && !isUiChromeOrIconLine(cleaned)) {
        reviewerName = cleaned;
        break;
      }
    }
  }

  if (!reviewerName) {
    const biIqbMatch = html.match(/<div[^>]*class="[^"]*biIqb[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (biIqbMatch?.[1]) {
      const innerBtns = biIqbMatch[1].matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi);
      for (const btn of innerBtns) {
        const cleaned = btn[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (cleaned && !isUiChromeOrIconLine(cleaned)) {
          reviewerName = cleaned;
          break;
        }
      }
    }
  }

  if (!reviewerName) {
    const altMatch = html.match(/alt="Photo of ([^"]+)"/i) || html.match(/aria-label="Photo of ([^"]+)"/i);
    if (altMatch?.[1]) {
      reviewerName = altMatch[1].trim();
    }
  }

  // 2. Review Text (HTML DOM matchers - supports inline <br> tags)
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

  // 5. Fallback to rendered text/markdown parser when HTML selectors are absent (e.g. Jina Reader)
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

function mergeScrapePatch(
  state: PartialScrapeState,
  patch: Partial<{
    shopName?: string;
    reviewerName?: string;
    reviewText?: string;
    starRating?: number;
    reviewId?: string;
  }>,
  sourceLabel?: string
): boolean {
  let added = false;
  if (!state.reviewerName && patch.reviewerName) {
    state.reviewerName = patch.reviewerName;
    added = true;
  }
  if (!state.starRating && patch.starRating) {
    state.starRating = patch.starRating;
    added = true;
  }
  if (!state.shopName && patch.shopName) {
    state.shopName = patch.shopName;
    added = true;
  }
  if (!state.reviewText && patch.reviewText) {
    state.reviewText = patch.reviewText;
    added = true;
  }
  if (!state.reviewId && patch.reviewId) {
    state.reviewId = patch.reviewId;
  }
  if (added && sourceLabel && !state.sources.includes(sourceLabel)) {
    state.sources.push(sourceLabel);
  }
  return added;
}

function parseRenderedHtmlResult(
  html: string,
  sourceLabel: string,
  fallbackReviewId: string | null,
  url?: string
): {
  unavailable?: boolean;
  captcha?: boolean;
  consent?: boolean;
  result?: LiveReviewScrapeResult;
} {
  if (isReviewUnavailableContent(html)) {
    const parsed = extractReviewDataFromHtml(html);
    return {
      unavailable: true,
      result: {
        success: false,
        isUnavailable: true,
        shopName: parsed.shopName,
        reviewId: fallbackReviewId || undefined,
        source: `${sourceLabel}-unavailable`,
        error: UNAVAILABLE_REVIEW_ERROR,
      },
    };
  }

  const interstitial = detectGoogleInterstitial(html, url);
  if (interstitial === "captcha") return { captcha: true };
  if (interstitial === "consent") return { consent: true };

  const parsed = extractReviewDataFromHtml(html);
  const reviewIdMatch = html.match(/data-review-id="([^"]+)"/);

  return {
    result: {
      success: Boolean(parsed.reviewerName || parsed.shopName || parsed.reviewText || parsed.starRating),
      shopName: parsed.shopName,
      reviewerName: parsed.reviewerName,
      reviewText: parsed.reviewText,
      starRating: parsed.starRating,
      reviewId: (reviewIdMatch ? reviewIdMatch[1] : fallbackReviewId) || undefined,
      source: sourceLabel,
    },
  };
}

/**
 * Local Node headless Chrome scraper using CDP event polling (stops immediately once author or unavailability renders).
 * Falls back to --dump-dom if CDP socket startup fails.
 */
async function scrapeWithLocalChrome(
  chromePath: string,
  targetUrl: string,
  fallbackReviewId: string | null,
  diagnostics: string[]
): Promise<LiveReviewScrapeResult | null> {
  const nodeMods = await loadNodeModules();
  if (!nodeMods) return null;

  const { fs, os, path, spawn, execFileAsync } = nodeMods;
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
    let port: string | null = null;
    const portFile = path.join(tmpProfile, "DevToolsActivePort");
    for (let i = 0; i < 25; i++) {
      if (fs.existsSync(portFile)) {
        const firstLine = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/)[0]?.trim();
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
            reject(new Error("CDP ws error"));
          });
        });

        ws.addEventListener("message", (ev: any) => {
          try {
            const parsed = JSON.parse(String(ev.data));
            if (parsed.id && pending.has(parsed.id)) {
              const fn = pending.get(parsed.id)!;
              pending.delete(parsed.id);
              fn(parsed.result);
            }
          } catch {}
        });

        await send("Network.enable");
        await send("Network.setUserAgentOverride", { userAgent: CHROME_USER_AGENT });
        await send("Page.navigate", { url: targetUrl });

        for (let tick = 0; tick < 36; tick++) {
          await new Promise((r) => setTimeout(r, 400));
          const evalRes = await send("Runtime.evaluate", {
            returnByValue: true,
            expression: `(() => {
              const bodyText = document.body ? document.body.innerText : '';
              const unavail = bodyText.includes('This review is no longer available') || bodyText.includes('review is unavailable');
              const btn = document.querySelector('button.P9Vtnb, button.fontTitleSmall');
              const actionEl = document.querySelector('[aria-label*="Actions for"]');
              const starEl = document.querySelector('.kvMYJc, [role="img"][aria-label*="star"]');
              const revEl = document.querySelector('.wiI7pd, .MyEned span');
              const shopEl = document.querySelector('.daF0l, h1.DUwDvf');
              const idEl = document.querySelector('[data-review-id]');
              return {
                unavail,
                author: btn?.textContent?.trim() || (actionEl?.getAttribute('aria-label') || '').replace(/^Actions for\\s+|[’']s review$/gi, '').trim() || undefined,
                starAria: starEl?.getAttribute('aria-label') || undefined,
                review: revEl?.textContent?.trim() || undefined,
                shop: shopEl?.textContent?.trim() || undefined,
                reviewId: idEl?.getAttribute('data-review-id') || undefined,
              };
            })()`,
          });

          const val = evalRes?.result?.value;
          if (val?.unavail) {
            diagnostics.push("local_chrome=unavailable");
            return {
              success: false,
              isUnavailable: true,
              shopName: decodeHtmlEntities(val.shop),
              source: "local-chrome-cdp",
              error: UNAVAILABLE_REVIEW_ERROR,
            };
          }

          if (val?.author) {
            if (!val.review && tick < 20) {
              await new Promise((r) => setTimeout(r, 350));
            }
            const starMatch = val.starAria?.match(/([1-5])/);
            diagnostics.push("local_chrome=ok");
            return {
              success: true,
              shopName: decodeHtmlEntities(val.shop),
              reviewerName: decodeHtmlEntities(val.author),
              reviewText: decodeHtmlEntities(val.review),
              starRating: starMatch ? parseInt(starMatch[1], 10) : undefined,
              reviewId: val.reviewId || fallbackReviewId || undefined,
              source: "local-chrome-cdp",
            };
          }
        }
        diagnostics.push("local_chrome=timeout");
      }
    }
  } catch (cdpErr) {
    diagnostics.push(`local_chrome_cdp_err=${cdpErr instanceof Error ? cdpErr.message : "err"}`);
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

  // Secondary local fallback: --dump-dom
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
      { maxBuffer: 25 * 1024 * 1024, timeout: 20000 }
    );
    const parsedDump = parseRenderedHtmlResult(stdout, "local-chrome-dump", fallbackReviewId);
    if (parsedDump.unavailable && parsedDump.result) {
      diagnostics.push("local_dump=unavailable");
      return parsedDump.result;
    }
    if (parsedDump.result?.reviewerName) {
      diagnostics.push("local_dump=ok");
    } else {
      diagnostics.push("local_dump=no_author");
    }
    return parsedDump.result || null;
  } catch {
    diagnostics.push("local_dump=err");
    return null;
  } finally {
    try {
      fs.rmSync(dumpProfile, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Cloudflare Workers Browser Rendering (@cloudflare/puppeteer via MYBROWSER binding).
 * Uses stealth masking, fast CAPTCHA/consent bail-out, and guarantees browser.close().
 */
async function scrapeWithCloudflareBrowser(
  candidateUrls: string[],
  fallbackReviewId: string | null,
  diagnostics: string[]
): Promise<LiveReviewScrapeResult | null> {
  const cfEnv = await getCloudflareEnv();
  const browserBinding = cfEnv?.MYBROWSER;
  if (!browserBinding) {
    diagnostics.push("mybrowser=not_bound");
    return null;
  }

  let browser: any = null;
  try {
    const puppeteer = (await import("@cloudflare/puppeteer")).default;
    browser = await puppeteer.launch(browserBinding);
    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    });
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent(CHROME_USER_AGENT);
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    for (const candidateUrl of candidateUrls.slice(0, 2)) {
      await page.goto(candidateUrl, { waitUntil: "domcontentloaded", timeout: 10000 });

      if (page.url().includes("consent.google.com")) {
        diagnostics.push("mybrowser=consent_gate");
        try {
          await page.evaluate(() => {
            const btn = document.querySelector<HTMLButtonElement>(
              'button[aria-label*="Reject all"], button[aria-label*="Accept all"], form button[type="submit"]'
            );
            btn?.click();
          });
          await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 5000 }).catch(() => {});
        } catch {}
      }

      await page
        .waitForFunction(
          () => {
            const href = window.location.href;
            if (href.includes("/sorry/")) return true;
            const bodyText = document.body ? document.body.innerText : "";
            if (
              bodyText.includes("unusual traffic") ||
              bodyText.includes("This review is no longer available") ||
              bodyText.includes("review is unavailable")
            ) {
              return true;
            }
            const authorBtn = document.querySelector("button.P9Vtnb");
            if (authorBtn?.textContent?.trim()) return true;
            const actionEl = document.querySelector('[aria-label*="Actions for"]');
            if (actionEl) return true;
            const photoEl = document.querySelector('img[alt*="Photo of"]');
            if (photoEl) return true;
            return false;
          },
          { timeout: 9000, polling: 250 }
        )
        .catch(() => {});

      const domEval = await page.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : "";
        const unavail =
          bodyText.includes("This review is no longer available") ||
          bodyText.includes("review is unavailable");
        const isCaptcha =
          window.location.href.includes("/sorry/") ||
          bodyText.includes("unusual traffic") ||
          Boolean(document.querySelector("#captcha-form, .g-recaptcha"));
        const btn = document.querySelector("button.P9Vtnb, button.fontTitleSmall");
        const starEl = document.querySelector('.kvMYJc, [role="img"][aria-label*="star"]');
        const revEl = document.querySelector(".wiI7pd, .MyEned span");
        const shopEl = document.querySelector(".daF0l, h1.DUwDvf");
        const idEl = document.querySelector("[data-review-id]");
        return {
          unavail,
          isCaptcha,
          currentUrl: window.location.href,
          author: btn?.textContent?.trim() || undefined,
          starAria: starEl?.getAttribute("aria-label") || undefined,
          review: revEl?.textContent?.trim() || undefined,
          shop: shopEl?.textContent?.trim() || undefined,
          reviewId: idEl?.getAttribute("data-review-id") || undefined,
        };
      });

      if (domEval?.isCaptcha) {
        diagnostics.push("mybrowser=captcha");
        return null;
      }

      if (domEval?.unavail) {
        diagnostics.push("mybrowser=unavailable");
        return {
          success: false,
          isUnavailable: true,
          shopName: decodeHtmlEntities(domEval.shop),
          source: "cloudflare-mybrowser",
          error: UNAVAILABLE_REVIEW_ERROR,
        };
      }

      const html = await page.content();
      const htmlParsed = parseRenderedHtmlResult(
        html,
        "cloudflare-mybrowser",
        fallbackReviewId,
        domEval?.currentUrl
      );

      if (htmlParsed.captcha) {
        diagnostics.push("mybrowser=captcha");
        return null;
      }
      if (htmlParsed.unavailable && htmlParsed.result) {
        diagnostics.push("mybrowser=unavailable");
        return htmlParsed.result;
      }

      const evalStarMatch = domEval?.starAria?.match(/([1-5])/);
      const starRating =
        (evalStarMatch ? parseInt(evalStarMatch[1], 10) : undefined) || htmlParsed.result?.starRating;
      const authorCandidate = decodeHtmlEntities(domEval?.author);
      const reviewerName =
        (authorCandidate && !isUiChromeOrIconLine(authorCandidate) ? authorCandidate : undefined) ||
        htmlParsed.result?.reviewerName;
      const reviewText = decodeHtmlEntities(domEval?.review) || htmlParsed.result?.reviewText;
      const shopName = decodeHtmlEntities(domEval?.shop) || htmlParsed.result?.shopName;

      if (reviewerName) {
        diagnostics.push("mybrowser=ok");
        return {
          success: true,
          shopName,
          reviewerName,
          reviewText,
          starRating,
          reviewId: domEval?.reviewId || htmlParsed.result?.reviewId || fallbackReviewId || undefined,
          source: "cloudflare-mybrowser",
        };
      }

      if (shopName || reviewText || starRating) {
        diagnostics.push("mybrowser=partial_no_author");
        return {
          success: true,
          shopName,
          reviewText,
          starRating,
          reviewId: domEval?.reviewId || htmlParsed.result?.reviewId || fallbackReviewId || undefined,
          source: "cloudflare-mybrowser",
        };
      }
    }

    diagnostics.push("mybrowser=no_author");
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    if (msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("time limit")) {
      diagnostics.push("mybrowser=quota_429");
    } else {
      diagnostics.push(`mybrowser=err(${msg.slice(0, 48)})`);
    }
    console.warn("Cloudflare puppeteer warning:", msg);
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
  candidateUrls: string[],
  diagnostics: string[]
): Promise<{ shopName?: string; starRating?: number }> {
  for (const url of candidateUrls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const ogRes = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });

      if (!ogRes.ok) {
        diagnostics.push(`og=${ogRes.status}`);
        continue;
      }

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

      if (shopName || starRating) {
        diagnostics.push("og=ok");
        return { shopName, starRating };
      }
    } catch {
      diagnostics.push("og=err");
    } finally {
      clearTimeout(timer);
    }
  }

  diagnostics.push("og=empty");
  return {};
}

interface JinaQueryOutput {
  status: number;
  unavailable?: boolean;
  captcha?: boolean;
  consent?: boolean;
  reviewerName?: string;
  reviewText?: string;
  shopName?: string;
}

async function queryJinaEndpoint(
  candidateUrl: string,
  format: "text" | "markdown",
  method: "GET" | "POST",
  apiKey?: string
): Promise<JinaQueryOutput> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 16000);
  try {
    const headers: Record<string, string> = {
      "User-Agent": CHROME_USER_AGENT,
      Accept: "text/plain, text/markdown;q=0.9, */*;q=0.8",
      "X-Wait-For-Selector": "button.P9Vtnb, button.fontTitleSmall, div.PbZDve",
      "X-Timeout": "15",
      "X-No-Cache": "true",
    };
    if (format === "text") {
      headers["X-Return-Format"] = "text";
    }
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const endpoint = method === "POST" ? "https://r.jina.ai/" : `https://r.jina.ai/${candidateUrl}`;
    const init: RequestInit =
      method === "POST"
        ? {
            method: "POST",
            signal: controller.signal,
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ url: candidateUrl }),
          }
        : {
            method: "GET",
            signal: controller.signal,
            headers,
          };

    const res = await fetch(endpoint, init);
    if (!res.ok) {
      return { status: res.status };
    }

    const content = await res.text();
    if (isReviewUnavailableContent(content)) {
      const parsed = extractReviewDataFromText(content);
      return { status: res.status, unavailable: true, shopName: parsed.shopName };
    }

    const interstitial = detectGoogleInterstitial(content);
    if (interstitial === "captcha") return { status: res.status, captcha: true };
    if (interstitial === "consent") return { status: res.status, consent: true };

    const parsed = extractReviewDataFromText(content);
    return {
      status: res.status,
      reviewerName: parsed.reviewerName,
      reviewText: parsed.reviewText,
      shopName: parsed.shopName,
    };
  } catch {
    return { status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Queries Jina Reader with diagnostics, supporting optional JINA_API_KEY, GET + POST fallback,
 * and both X-Return-Format: text and markdown modes.
 */
async function fetchViaJina(
  candidateUrls: string[],
  diagnostics: string[]
): Promise<{
  isUnavailable?: boolean;
  reviewerName?: string;
  reviewText?: string;
  shopName?: string;
}> {
  const jinaApiKey = await getRuntimeSecret("JINA_API_KEY");
  let fallbackShop: string | undefined;
  let fallbackText: string | undefined;

  for (const candidateUrl of candidateUrls) {
    // 1. Primary GET text snapshot
    let res = await queryJinaEndpoint(candidateUrl, "text", "GET", jinaApiKey);
    diagnostics.push(`jina_get_text=${res.status}${res.reviewerName ? "(author)" : res.captcha ? "(captcha)" : res.consent ? "(consent)" : ""}`);

    if (res.unavailable) return { isUnavailable: true, shopName: res.shopName };
    if (res.reviewerName) return res;
    if (res.shopName) fallbackShop = fallbackShop || res.shopName;
    if (res.reviewText) fallbackText = fallbackText || res.reviewText;

    // 2. If GET failed (e.g. HTTP 403/429/0), try POST endpoint once
    if (res.status !== 200) {
      const postRes = await queryJinaEndpoint(candidateUrl, "text", "POST", jinaApiKey);
      diagnostics.push(`jina_post_text=${postRes.status}${postRes.reviewerName ? "(author)" : ""}`);
      if (postRes.unavailable) return { isUnavailable: true, shopName: postRes.shopName };
      if (postRes.reviewerName) return postRes;
      if (postRes.shopName) fallbackShop = fallbackShop || postRes.shopName;
      if (postRes.reviewText) fallbackText = fallbackText || postRes.reviewText;

      // Hard stop if both GET and POST were rate-limited or blocked at IP/edge level
      if ((res.status === 429 || res.status === 403) && (postRes.status === 429 || postRes.status === 403)) {
        break;
      }
      if (postRes.status !== 200) continue;
    }

    // 3. Fallback to Markdown mode (preserves ![Image: Photo of Author]) on valid 200 render
    res = await queryJinaEndpoint(candidateUrl, "markdown", "GET", jinaApiKey);
    diagnostics.push(`jina_get_md=${res.status}${res.reviewerName ? "(author)" : ""}`);
    if (res.unavailable) return { isUnavailable: true, shopName: res.shopName };
    if (res.reviewerName) return res;
    if (res.shopName) fallbackShop = fallbackShop || res.shopName;
    if (res.reviewText) fallbackText = fallbackText || res.reviewText;
  }

  return { shopName: fallbackShop, reviewText: fallbackText };
}

/**
 * Queries optional external headless browser providers (ScrapingAnt / Browserless) via standard fetch
 * when configured in environment secrets and built-in renderers could not extract the author.
 */
async function fetchViaExternalBrowserProvider(
  provider: "scrapingant" | "browserless",
  candidateUrl: string,
  fallbackReviewId: string | null,
  diagnostics: string[]
): Promise<LiveReviewScrapeResult | null> {
  const secretKey = provider === "scrapingant" ? "SCRAPINGANT_API_KEY" : "BROWSERLESS_TOKEN";
  const token = await getRuntimeSecret(secretKey);
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res =
      provider === "scrapingant"
        ? await fetch(
            `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(candidateUrl)}&x-api-key=${encodeURIComponent(token)}&browser=true&wait_for_selector=${encodeURIComponent("button.P9Vtnb,button.fontTitleSmall")}`,
            { signal: controller.signal }
          )
        : await fetch(`https://production-sfo.browserless.io/content?token=${encodeURIComponent(token)}`, {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: candidateUrl,
              waitForSelector: { selector: "button.P9Vtnb, button.fontTitleSmall", timeout: 10000 },
            }),
          });

    if (!res.ok) {
      diagnostics.push(`${provider}=${res.status}`);
      return null;
    }

    const html = await res.text();
    const parsed = parseRenderedHtmlResult(html, provider, fallbackReviewId, candidateUrl);
    if (parsed.unavailable && parsed.result) {
      diagnostics.push(`${provider}=unavailable`);
      return parsed.result;
    }
    if (parsed.captcha) {
      diagnostics.push(`${provider}=captcha`);
      return null;
    }
    if (parsed.result?.reviewerName) {
      diagnostics.push(`${provider}=ok`);
      return parsed.result;
    }

    diagnostics.push(`${provider}=no_author`);
    return parsed.result || null;
  } catch {
    diagnostics.push(`${provider}=err`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Scrapes live Google Maps review DOM using local headless Chromium (Node dev)
 * or Cloudflare serverless pipeline (OpenGraph + Jina Reader -> MYBROWSER -> optional cloud browsers).
 */
export async function scrapeGoogleMapsLiveReview(
  reviewUrl: string,
  preResolvedUrl?: string
): Promise<LiveReviewScrapeResult> {
  const targetUrl = preResolvedUrl || (await resolveGoogleMapsUrl(reviewUrl));
  const cleanReviewUrl = stripTrackingParams(reviewUrl);
  const reviewId = extractGoogleReviewId(targetUrl);

  const candidateUrls = Array.from(
    new Set([cleanReviewUrl, targetUrl].filter((u) => Boolean(u && u.trim())))
  );

  const state: PartialScrapeState = {
    reviewId: reviewId || undefined,
    sources: [],
    diagnostics: [],
  };

  // 1. Local dev headless Chrome via CDP
  const chromePath = await findChromePath();
  if (chromePath) {
    const localResult = await scrapeWithLocalChrome(chromePath, targetUrl, reviewId, state.diagnostics);
    if (localResult?.isUnavailable) {
      return { ...localResult, diagnostics: state.diagnostics };
    }
    if (localResult) {
      mergeScrapePatch(state, localResult, localResult.source || "local-chrome");
      if (state.reviewerName && state.starRating && state.shopName && state.reviewText) {
        return {
          success: true,
          shopName: state.shopName,
          reviewerName: state.reviewerName,
          reviewText: state.reviewText,
          starRating: state.starRating,
          reviewId: state.reviewId,
          source: state.sources.join("+"),
          diagnostics: state.diagnostics,
        };
      }
    }
  }

  // 2. OpenGraph (stars + shop name) & Jina Reader (author + review text + shop name)
  if (!state.reviewerName || !state.starRating || !state.reviewText || !state.shopName) {
    const needOg = !state.starRating || !state.shopName;
    const needJina = !state.reviewerName || !state.reviewText;

    const [ogData, jinaData] = await Promise.all([
      needOg
        ? fetchOpenGraphMetadata([targetUrl, cleanReviewUrl], state.diagnostics)
        : Promise.resolve<{ shopName?: string; starRating?: number }>({}),
      needJina
        ? fetchViaJina(candidateUrls, state.diagnostics)
        : Promise.resolve<{ isUnavailable?: boolean; reviewerName?: string; reviewText?: string; shopName?: string }>({}),
    ]);

    if (jinaData.isUnavailable) {
      return {
        success: false,
        isUnavailable: true,
        shopName: jinaData.shopName || ogData.shopName || state.shopName,
        reviewId: state.reviewId,
        source: "jina-unavailable",
        diagnostics: state.diagnostics,
        error: UNAVAILABLE_REVIEW_ERROR,
      };
    }

    mergeScrapePatch(state, ogData, "og");
    mergeScrapePatch(state, jinaData, "jina");
  }

  // 3. Serverless headless browser fallback if author name or stars still missing
  if (!chromePath && (!state.reviewerName || !state.starRating)) {
    const cfResult = await scrapeWithCloudflareBrowser(candidateUrls, reviewId, state.diagnostics);
    if (cfResult?.isUnavailable) {
      return { ...cfResult, diagnostics: state.diagnostics };
    }
    if (cfResult) {
      mergeScrapePatch(state, cfResult, cfResult.source || "cloudflare-mybrowser");
    }
  }

  // 4. Optional zero-maintenance cloud headless providers if configured and author still missing
  if (!state.reviewerName) {
    for (const provider of ["scrapingant", "browserless"] as const) {
      const extResult = await fetchViaExternalBrowserProvider(
        provider,
        candidateUrls[0] || targetUrl,
        reviewId,
        state.diagnostics
      );
      if (extResult?.isUnavailable) {
        return { ...extResult, diagnostics: state.diagnostics };
      }
      if (extResult) {
        mergeScrapePatch(state, extResult, provider);
        if (state.reviewerName) break;
      }
    }
  }

  return {
    success: Boolean(
      state.shopName || state.reviewerName || state.starRating || state.reviewId
    ),
    shopName: state.shopName,
    reviewerName: state.reviewerName,
    reviewText: state.reviewText,
    starRating: state.starRating,
    reviewId: state.reviewId,
    source: state.sources.length > 0 ? state.sources.join("+") : "none",
    diagnostics: state.diagnostics,
  };
}

/**
 * Verifies if reviewer's name matches logged-in Google Account name.
 */
export function isReviewerNameMatch(expectedName: string, actualName: string): boolean {
  if (!expectedName || !actualName) return false;
  const exp = expectedName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const act = actualName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (exp === act) return true;
  if (exp.length >= 3 && act.length >= 3 && (exp.includes(act) || act.includes(exp))) {
    return true;
  }

  // First name match (e.g. "Jayraj Thakur" vs "Jayraj")
  const expParts = expectedName.toLowerCase().split(/\s+/).filter(Boolean);
  const actParts = actualName.toLowerCase().split(/\s+/).filter(Boolean);
  if (expParts.length > 0 && actParts.length > 0) {
    if (expParts[0] === actParts[0] && expParts[0].length >= 2) return true;
  }

  // Email prefix matching (e.g. "jayraj.0.thakur@gmail.com" vs "Jayraj Thakur")
  if (expectedName.includes("@")) {
    const emailPrefix = expectedName.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    if (act.length >= 3 && (act.includes(emailPrefix) || emailPrefix.includes(act))) return true;
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
    return true;
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

  if (normExp === normAct || normAct.includes(normExp) || normExp.includes(normAct)) {
    return { matches: true, score: 1.0 };
  }

  const actPrefix = normAct.slice(0, Math.min(normAct.length, 100));
  if (actPrefix.length >= 25 && normExp.startsWith(actPrefix)) {
    return { matches: true, score: 1.0 };
  }

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
