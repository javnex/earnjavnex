import { NextResponse } from "next/server";
import { getAuthOptions } from "@/lib/auth";
import { openidClient } from "next-auth/core/lib/oauth/client";
import getAuthorizationUrl from "next-auth/core/lib/oauth/authorization-url";

export async function GET() {
  try {
    const opts = getAuthOptions();
    const provider = opts.providers.find((p: any) => p.id === "google") as any;

    let authUrlResult: any = "not run";
    let authUrlError: any = null;

    try {
      const fullOptions: any = {
        ...opts,
        provider,
        url: "https://earn.javnex.in/api/auth",
        action: "signin",
        cookies: {
          csrfToken: { name: "next-auth.csrf-token", options: {} },
          pkceCodeVerifier: { name: "next-auth.pkce.code_verifier", options: {} },
          state: { name: "next-auth.state", options: {} },
          nonce: { name: "next-auth.nonce", options: {} },
        },
        logger: {
          debug: () => {},
          warn: () => {},
          error: (code: any, meta: any) => console.error(code, meta),
        },
      };

      const res = await getAuthorizationUrl({
        options: fullOptions,
        query: {},
      });
      authUrlResult = res;
    } catch (e: any) {
      authUrlError = {
        name: e.name,
        message: e.message,
        stack: e.stack,
      };
    }

    return NextResponse.json({
      authUrlResult,
      authUrlError,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        topError: err.message,
        stack: err.stack,
      },
      { status: 500 }
    );
  }
}
