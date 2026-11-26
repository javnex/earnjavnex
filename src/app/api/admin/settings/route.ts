import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const settingsSchema = z.object({
  verificationMode: z.enum(["AUTO", "MANUAL"]).optional(),
  cashoutBufferPercent: z.number().min(0).max(50).optional(),
  minWithdrawalInr: z.number().positive().optional(),
  usdtInrRate: z.number().positive().optional(),
});

// GET /api/admin/settings
export async function GET() {
  try {
    try {
      const supabase = getSupabaseAdmin();
      const { data: supaSetting, error: sErr } = await supabase
        .from("Setting")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (!sErr && supaSetting) {
        return NextResponse.json({ setting: supaSetting });
      }
    } catch (supaErr) {
      console.warn("Supabase settings fallback to prisma:", supaErr);
    }

    const setting = await prisma.setting.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        verificationMode: "AUTO",
        cashoutBufferPercent: 6.0,
        minWithdrawalInr: 100.0,
        usdtInrRate: 90.5,
      },
    });

    return NextResponse.json({ setting });
  } catch (error: any) {
    console.error("GET /api/admin/settings error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

// PATCH /api/admin/settings (Admin only)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = (session?.user as any)?.email;
    if (!session || (session.user as any)?.role !== "ADMIN" || !isAdminEmail(email)) {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    try {
      const supabase = getSupabaseAdmin();
      const { data: updatedSupa, error: uErr } = await supabase
        .from("Setting")
        .upsert({
          id: "default",
          ...parsed.data,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (!uErr && updatedSupa) {
        return NextResponse.json({ success: true, setting: updatedSupa });
      }
    } catch (supaErr) {
      console.warn("Supabase update settings fallback to prisma:", supaErr);
    }

    const updated = await prisma.setting.upsert({
      where: { id: "default" },
      update: parsed.data,
      create: {
        id: "default",
        ...parsed.data,
      },
    });

    return NextResponse.json({ success: true, setting: updated });
  } catch (error: any) {
    console.error("PATCH /api/admin/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
