import { NextResponse } from "next/server";
import { Issuer, generators } from "openid-client";
import { getAuthOptions } from "@/lib/auth";

export async function GET() {
  const diagnostics: Record<string, any> = {};

  try {
    const opts = getAuthOptions();
    diagnostics.opts = {
      hasSecret: !!opts.secret,
      secretLength: (opts.secret as string)?.length,
      envGoogleSecretLen: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
      envGoogleIdLen: process.env.GOOGLE_CLIENT_ID?.length || 0,
      nextAuthUrl: process.env.NEXTAUTH_URL,
    };

    // Step 1: Issuer
    const issuer = await Issuer.discover("https://accounts.google.com/.well-known/openid-configuration");
    diagnostics.issuer = "discovered";

    // Step 2: Client
    const clientId = process.env.GOOGLE_CLIENT_ID || "758717407504-589te6v2b5gc0mgodjrnacpg6romi2ku.apps.googleusercontent.com";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const client = new issuer.Client({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: ["https://earn.javnex.in/api/auth/callback/google"],
    });
    diagnostics.client = "created";

    // Step 3: Verifier & Challenge
    const verifier = generators.codeVerifier();
    const challenge = generators.codeChallenge(verifier);
    diagnostics.pkce = { verifierLen: verifier.length, challengeLen: challenge.length };

    // Step 4: Auth URL
    const url = client.authorizationUrl({
      scope: "openid email profile",
      response_type: "code",
      redirect_uri: "https://earn.javnex.in/api/auth/callback/google",
      state: "test-state",
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    diagnostics.authUrl = url;

    return NextResponse.json({ success: true, diagnostics });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      diagnostics,
      error: {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
    }, { status: 500 });
  }
}
