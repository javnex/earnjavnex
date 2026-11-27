import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import prisma from "@/lib/prisma";
import { broadcastNewTaskAlert } from "@/lib/mailer";

// POST /api/admin/tasks/broadcast - Manually broadcast email alert for a task to all opted-in users
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const adminEmail = (session?.user as any)?.email;

    if (!session || (session.user as any)?.role !== "ADMIN" || !isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // 1. Fetch task details
    let task: any = null;
    try {
      const supabase = getSupabaseAdmin();
      const { data: supaTask } = await supabase
        .from("Task")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();
      if (supaTask) task = supaTask;
    } catch (e) {
      console.warn("Supabase fetch task fallback:", e);
    }

    if (!task) {
      task = await prisma.task.findUnique({ where: { id: taskId } });
    }

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 2. Fetch all opted-in users
    let targetUsers: Array<{ email: string; name?: string | null }> = [];
    try {
      const supabase = getSupabaseAdmin();
      const { data: supaUsers } = await supabase
        .from("User")
        .select("email, name, task_alerts_enabled");

      targetUsers = (supaUsers || []).filter(
        (u: any) => u.task_alerts_enabled !== false && u.email
      );
    } catch (e) {
      console.warn("Supabase fetch users fallback:", e);
    }

    if (targetUsers.length === 0) {
      const pUsers = await prisma.user.findMany({
        where: { task_alerts_enabled: true },
        select: { email: true, name: true },
      });
      targetUsers = pUsers;
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No opted-in users found to broadcast to",
      }, { status: 404 });
    }

    // 3. Dispatch broadcast
    const result = await broadcastNewTaskAlert(targetUsers, {
      taskId: task.id,
      title: task.title,
      rewardInr: task.rewardInr,
      instructions: task.instructions,
    });

    return NextResponse.json({
      success: true,
      message: `Broadcast complete! Alert sent to ${result.sent} user(s).`,
      details: result,
    });
  } catch (err: any) {
    console.error("Broadcast task alert error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to broadcast task alert",
    }, { status: 500 });
  }
}
