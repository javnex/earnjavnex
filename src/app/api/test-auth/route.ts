import { NextResponse } from "next/server";
import { getAuthOptions } from "@/lib/auth";

export async function GET() {
  try {
    const opts = getAuthOptions();
    const provider = opts.providers.find((p: any) => p.id === "google") as any;

    let googleDiscovery = "untested";
    try {
      const res = await fetch(
        "https://accounts.google.com/.well-known/openid-configuration"
      );
      googleDiscovery = `HTTP ${res.status}`;
    } catch (e: any) {
      googleDiscovery = `Fetch failed: ${e.message}`;
    }

    return NextResponse.json({
      envStatus: {
        HAS_GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_ID_START: (process.env.GOOGLE_CLIENT_ID || "").substring(0, 10),
        HAS_GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_CLIENT_SECRET_LENGTH: (process.env.GOOGLE_CLIENT_SECRET || "").length,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "undefined",
        HAS_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      },
      providerConfig: {
        id: provider?.id,
        name: provider?.name,
        type: provider?.type,
        hasClientId: !!provider?.options?.clientId || !!provider?.clientId,
        hasClientSecret: !!provider?.options?.clientSecret || !!provider?.clientSecret,
      },
      googleDiscovery,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message,
        stack: err.stack,
      },
      { status: 500 }
    );
  }
}
