import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  adminNotes: z.string().optional(),
});

// PATCH /api/submissions/[id] (Admin only)
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
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { action, adminNotes } = parsed.data;
    const supabase = getSupabaseAdmin();

    // 1. Fetch submission with task details
    const { data: submission, error: subErr } = await supabase
      .from("Submission")
      .select("*, task:Task(*)")
      .eq("id", id)
      .maybeSingle();

    if (subErr || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.status !== "PENDING") {
      return NextResponse.json(
        { error: `Submission has already been marked as ${submission.status}` },
        { status: 400 }
      );
    }

    if (action === "APPROVE") {
      const reward = submission.rewardCredited || submission.task?.rewardInr || 10;
      const newCount = (submission.task?.completedCount || 0) + 1;
      const willClose = newCount >= (submission.task?.maxLimit || 1);

      // 1. Update submission status
      const { data: updatedSub } = await supabase
        .from("Submission")
        .update({
          status: "APPROVED",
          adminNotes: adminNotes || "Approved by Admin",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      // 2. Increment task completedCount & auto-close if reached
      await supabase
        .from("Task")
        .update({
          completedCount: newCount,
          status: willClose ? "CLOSED" : "ACTIVE",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", submission.taskId);

      // 3. Credit User's wallet balance
      const { data: curUser } = await supabase
        .from("User")
        .select("walletBalance")
        .eq("id", submission.userId)
        .single();

      const newBalance = Number(((curUser?.walletBalance || 0) + reward).toFixed(2));
      await supabase
        .from("User")
        .update({
          walletBalance: newBalance,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", submission.userId);

      return NextResponse.json({
        success: true,
        updatedSub,
        status: "APPROVED",
        rewardCredited: reward,
      });
    } else {
      // REJECT
      const { data: updatedSub } = await supabase
        .from("Submission")
        .update({
          status: "REJECTED",
          adminNotes: adminNotes || "Rejected by Admin (Invalid review URL)",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      return NextResponse.json({
        success: true,
        updatedSub,
        status: "REJECTED",
      });
    }
  } catch (error: any) {
    console.error("PATCH /api/submissions/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update submission" },
      { status: 500 }
    );
  }
}
