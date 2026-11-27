import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/user/preferences
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = (session.user as any).email;

    try {
      const supabase = getSupabaseAdmin();
      const { data: supaUser } = await supabase
        .from("User")
        .select("task_alerts_enabled")
        .or(`id.eq.${userId},email.eq.${userEmail}`)
        .maybeSingle();

      if (supaUser) {
        return NextResponse.json({
          task_alerts_enabled: supaUser.task_alerts_enabled ?? true,
        });
      }
    } catch (supaErr) {
      console.warn("Supabase user/preferences fallback to prisma:", supaErr);
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ id: userId }, { email: userEmail }] },
      select: { task_alerts_enabled: true },
    });

    return NextResponse.json({
      task_alerts_enabled: user?.task_alerts_enabled ?? true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }
}

// PATCH /api/user/preferences
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = (session.user as any).email;
    const body = await req.json();

    const task_alerts_enabled = Boolean(body.task_alerts_enabled);

    try {
      const supabase = getSupabaseAdmin();
      await supabase
        .from("User")
        .update({
          task_alerts_enabled,
          updatedAt: new Date().toISOString(),
        })
        .or(`id.eq.${userId},email.eq.${userEmail}`);
    } catch (supaErr) {
      console.warn("Supabase user/preferences update fallback to prisma:", supaErr);
    }

    await prisma.user.updateMany({
      where: { OR: [{ id: userId }, { email: userEmail }] },
      data: { task_alerts_enabled },
    });

    return NextResponse.json({
      success: true,
      task_alerts_enabled,
      message: task_alerts_enabled
        ? "Task alerts enabled. You will receive email notifications for new tasks."
        : "Task alerts turned off. You will not receive new task emails.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
