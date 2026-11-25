import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const submissionSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  proofLink: z
    .string()
    .url("Proof link must be a valid URL")
    .refine(
      (url) => url.startsWith("http://") || url.startsWith("https://"),
      "URL must start with http:// or https://"
    ),
});

// GET /api/submissions
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    if (userRole === "ADMIN") {
      // Admin sees all submissions with filters
      const where: any = {};
      if (statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(statusFilter)) {
        where.status = statusFilter;
      }

      const submissions = await prisma.submission.findMany({
        where,
        include: {
          task: { select: { title: true, shopUrl: true, rewardInr: true } },
          user: { select: { name: true, email: true, userCode: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ submissions });
    }

    // Regular user sees only their own submissions
    const submissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        task: { select: { title: true, shopUrl: true, rewardInr: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ submissions });
  } catch (error: any) {
    console.error("GET /api/submissions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// POST /api/submissions - Submit a review link
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const parsed = submissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { taskId, proofLink } = parsed.data;
    const trimmedProofLink = proofLink.trim();

    // 1. Check Global Proof Link Uniqueness
    const duplicateProof = await prisma.submission.findUnique({
      where: { proofLink: trimmedProofLink },
    });
    if (duplicateProof) {
      return NextResponse.json(
        {
          error:
            "This review link has already been submitted by another account. Every review proof must be unique.",
        },
        { status: 400 }
      );
    }

    // 2. Check 1 User ID = 1 Submission per Shop
    const existingUserSubmission = await prisma.submission.findUnique({
      where: {
        userId_taskId: {
          userId,
          taskId,
        },
      },
    });
    if (existingUserSubmission) {
      return NextResponse.json(
        {
          error:
            "You have already completed this task! Strict policy: 1 submission per Google account per shop.",
        },
        { status: 400 }
      );
    }

    // 3. Fetch Settings for Verification Mode
    const setting =
      (await prisma.setting.findUnique({ where: { id: "default" } })) || {
        verificationMode: "AUTO",
      };

    const isAutoMode = setting.verificationMode === "AUTO";

    // 4. Atomic Database Transaction with auto-close logic
    const result = await prisma.$transaction(async (tx) => {
      // Re-check task limit inside transaction
      const task = await tx.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      if (task.status !== "ACTIVE" || task.completedCount >= task.maxLimit) {
        throw new Error("This task has reached its maximum limit and is now closed.");
      }

      const rewardAmount = task.rewardInr;
      const newCompletedCount = isAutoMode
        ? task.completedCount + 1
        : task.completedCount; // in manual mode count updates on admin approval
      const willClose = newCompletedCount >= task.maxLimit;

      // Create submission
      const submission = await tx.submission.create({
        data: {
          userId,
          taskId,
          proofLink: trimmedProofLink,
          status: isAutoMode ? "APPROVED" : "PENDING",
          rewardCredited: rewardAmount,
        },
      });

      // Update task stats
      if (isAutoMode) {
        await tx.task.update({
          where: { id: taskId },
          data: {
            completedCount: newCompletedCount,
            status: willClose ? "CLOSED" : "ACTIVE",
          },
        });

        // Credit user wallet
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            walletBalance: {
              increment: rewardAmount,
            },
          },
          select: { walletBalance: true },
        });

        return {
          submission,
          credited: true,
          rewardAmount,
          newBalance: updatedUser.walletBalance,
          taskClosed: willClose,
        };
      }

      return {
        submission,
        credited: false,
        rewardAmount,
        taskClosed: false,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: isAutoMode
          ? `Review verified! ₹${result.rewardAmount} credited to your wallet.`
          : "Review submitted for verification. Reward will be credited upon approval.",
        ...result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/submissions error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to process submission" },
      { status: 400 }
    );
  }
}
