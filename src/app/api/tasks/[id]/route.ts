import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const updateTaskSchema = z.object({
  title: z.string().min(3).optional(),
  shopUrl: z.string().url().optional(),
  instructions: z.string().min(5).optional(),
  rewardInr: z.number().positive().optional(),
  maxLimit: z.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "CLOSED"]).optional(),
});

// PATCH /api/tasks/[id] (Admin only)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const email = (session?.user as any)?.email;
    if (!session || (session.user as any)?.role !== "ADMIN" || !isAdminEmail(email)) {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    // 1. Try fast HTTPS via Supabase (Port 443 - zero timeout)
    try {
      const supabase = getSupabaseAdmin();
      const { data: updatedTask, error: updateErr } = await supabase
        .from("Task")
        .update(parsed.data)
        .eq("id", id)
        .select()
        .single();

      if (!updateErr && updatedTask) {
        return NextResponse.json({ task: updatedTask });
      }
    } catch (supaErr) {
      console.warn("Supabase task PATCH fallback to prisma:", supaErr);
    }

    // Fallback to Prisma
    const updatedTask = await prisma.task.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    console.error("PATCH /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] (Admin only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const email = (session?.user as any)?.email;
    if (!session || (session.user as any)?.role !== "ADMIN" || !isAdminEmail(email)) {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    const { id } = await params;

    // 1. Try fast HTTPS via Supabase (Port 443 - zero timeout)
    try {
      const supabase = getSupabaseAdmin();
      // First clean up any submissions referencing this task to avoid foreign key violations
      await supabase.from("Submission").delete().eq("taskId", id);

      // Now delete the task
      const { error: delErr } = await supabase.from("Task").delete().eq("id", id);
      if (!delErr) {
        return NextResponse.json({ success: true });
      }
    } catch (supaErr) {
      console.warn("Supabase task DELETE fallback to prisma:", supaErr);
    }

    // Fallback to Prisma
    await prisma.submission.deleteMany({ where: { taskId: id } }).catch(() => {});
    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}
