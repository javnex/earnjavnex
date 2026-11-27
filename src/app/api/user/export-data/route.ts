import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import prisma from "@/lib/prisma";

// GET /api/user/export-data - DPDP Act 2023 Section 11 Right to Information & Access
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = (session.user as any).email;
    const supabase = getSupabaseAdmin();

    // 1. Fetch User Record
    const { data: user } = await supabase
      .from("User")
      .select("id, name, email, userCode, role, walletBalance, createdAt, updatedAt")
      .eq("id", userId)
      .single();

    // 2. Fetch User Submissions
    const { data: submissions } = await supabase
      .from("Submission")
      .select("id, proofLink, status, rewardCredited, adminNotes, createdAt, task:Task(title, shopUrl)")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    // 3. Fetch Transfers
    const { data: transfers } = await supabase
      .from("WalletTransfer")
      .select("id, amountInr, note, createdAt, senderId, receiverId")
      .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
      .order("createdAt", { ascending: false });

    // 4. Fetch Withdrawals
    const { data: withdrawals } = await supabase
      .from("Withdrawal")
      .select("id, amountInr, bufferedInr, usdtAmount, walletAddress, status, txHash, createdAt")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    const exportPayload = {
      exportMetadata: {
        platform: "EarnReward",
        statutoryAuthority: "Digital Personal Data Protection Act, 2023 (Section 11)",
        exportedAt: new Date().toISOString(),
        dataPrincipalEmail: userEmail,
      },
      profile: user || null,
      taskSubmissions: submissions || [],
      internalTransfers: transfers || [],
      cryptocurrencyPayouts: withdrawals || [],
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="earnreward-datapackage-${user?.userCode || "USR"}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to generate personal data package" },
      { status: 500 }
    );
  }
}
