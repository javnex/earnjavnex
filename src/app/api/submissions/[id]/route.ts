import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
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

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { task: true, user: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.status !== "PENDING") {
      return NextResponse.json(
        { error: `Submission has already been marked as ${submission.status}` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === "APPROVE") {
        const reward = submission.rewardCredited || submission.task.rewardInr;
        const newCount = submission.task.completedCount + 1;
        const willClose = newCount >= submission.task.maxLimit;

        // 1. Update submission status
        const updatedSub = await tx.submission.update({
          where: { id },
          data: {
            status: "APPROVED",
            adminNotes: adminNotes || "Approved by Admin",
          },
        });

        // 2. Increment task completedCount & auto-close if reached
        await tx.task.update({
          where: { id: submission.taskId },
          data: {
            completedCount: newCount,
            status: willClose ? "CLOSED" : "ACTIVE",
          },
        });

        // 3. Credit User's wallet balance
        await tx.user.update({
          where: { id: submission.userId },
          data: {
            walletBalance: { increment: reward },
          },
        });

        return { updatedSub, status: "APPROVED", rewardCredited: reward };
      } else {
        // REJECT
        const updatedSub = await tx.submission.update({
          where: { id },
          data: {
            status: "REJECTED",
            adminNotes: adminNotes || "Rejected by Admin (Invalid review URL)",
          },
        });
        return { updatedSub, status: "REJECTED" };
      }
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("PATCH /api/submissions/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update submission" },
      { status: 500 }
    );
  }
}
