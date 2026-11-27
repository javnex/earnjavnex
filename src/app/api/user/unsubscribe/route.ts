import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";

// POST /api/user/unsubscribe
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    try {
      const supabase = getSupabaseAdmin();
      await supabase
        .from("User")
        .update({
          task_alerts_enabled: false,
          updatedAt: new Date().toISOString(),
        })
        .eq("email", normalized);
    } catch (supaErr) {
      console.warn("Supabase unsubscribe fallback to prisma:", supaErr);
    }

    await prisma.user.updateMany({
      where: { email: normalized },
      data: { task_alerts_enabled: false },
    });

    return NextResponse.json({
      success: true,
      message: `Task alert emails have been turned off for ${normalized}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
