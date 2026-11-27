/**
 * Universal Environment Variable Helper for Cloudflare Workers & Next.js
 * Works seamlessly across Node.js runtime, OpenNext Cloudflare isolates, and Edge.
 */
export function getEnv(key: string): string | undefined {
  // 1. Check process.env (Local dev, Next.js build-time, Node.js)
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }

  // 2. Check OpenNext Cloudflare global context (__cloudflare-context__)
  try {
    const cfSymbol = Symbol.for("__cloudflare-context__");
    const cfContext = (globalThis as any)[cfSymbol];
    if (cfContext?.env && typeof cfContext.env[key] !== "undefined") {
      return String(cfContext.env[key]);
    }
  } catch {}

  // 3. Fallback to @opennextjs/cloudflare getCloudflareContext()
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext({ async: false });
    if (ctx?.env && typeof ctx.env[key] !== "undefined") {
      return String(ctx.env[key]);
    }
  } catch {}

  return undefined;
}
