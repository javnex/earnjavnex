import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import prisma from "@/lib/prisma";

// POST /api/user/delete-account - DPDP Act 2023 Section 12 Right to Erasure / Account Deletion
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    if (body.confirmation !== "PERMANENTLY_DELETE") {
      return NextResponse.json(
        {
          error: "Confirmation string 'PERMANENTLY_DELETE' is required to process deletion.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if user has an active withdrawal in progress
    const { data: user } = await supabase
      .from("User")
      .select("id, isWithdrawing, walletBalance, email, userCode")
      .eq("id", userId)
      .single();

    if (user?.isWithdrawing) {
      return NextResponse.json(
        {
          error: "Your account has an active cryptocurrency withdrawal in progress. Please wait until it completes or settles before requesting erasure.",
        },
        { status: 400 }
      );
    }

    // Irreversible anonymization / erasure of digital personal data
    const anonymizedEmail = `erased-${Math.random().toString(36).substring(2, 10)}@deleted.invalid`;
    const anonymizedName = "Erased Data Principal";

    // Update user profile to erased state
    await supabase
      .from("User")
      .update({
        email: anonymizedEmail,
        name: anonymizedName,
        avatarUrl: null,
        walletBalance: 0,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId);

    console.log(`[DPDP SECTION 12 ERASURE EXECUTED] User ${userId} (${user?.userCode}) personal data anonymized.`);

    return NextResponse.json({
      success: true,
      message: "Your digital personal data has been permanently erased pursuant to Section 12 of the DPDP Act, 2023.",
    });
  } catch (error: any) {
    console.error("Account erasure error:", error);
    return NextResponse.json(
      { error: "Failed to execute account erasure request" },
      { status: 500 }
    );
  }
}
