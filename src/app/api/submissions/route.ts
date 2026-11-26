import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  verifyGoogleReviewMatch,
  scrapeGoogleMapsLiveReview,
  isReviewerNameMatch,
  isReviewTextMatch,
} from "@/lib/google-maps";
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
  assignedReviewText: z.string().optional(),
  reviewerName: z.string().optional(),
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
    const userEmail = (session.user as any).email;
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    if (userRole === "ADMIN" && isAdminEmail(userEmail)) {
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

    const { taskId, proofLink, assignedReviewText, reviewerName } = parsed.data;
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

    // 3. Verify Target Task & Check Google Maps Match
    const targetTask = await prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!targetTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (targetTask.status !== "ACTIVE" || targetTask.completedCount >= targetTask.maxLimit) {
      return NextResponse.json(
        { error: "This task has reached its maximum limit and is now closed." },
        { status: 400 }
      );
    }

    // Advanced Anti-Cheat: Validate that proofLink is an actual review belonging to this shop
    const validation = await verifyGoogleReviewMatch({
      shopUrl: targetTask.shopUrl,
      proofLink: trimmedProofLink,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason || "Invalid review proof link." },
        { status: 400 }
      );
    }

    // Check canonical review token uniqueness across all submissions
    if (validation.reviewId) {
      const duplicateReview = await prisma.submission.findFirst({
        where: {
          proofLink: {
            contains: validation.reviewId,
          },
        },
      });
      if (duplicateReview) {
        return NextResponse.json(
          {
            error:
              "This specific Google review has already been submitted and claimed! You cannot reuse the same review.",
          },
          { status: 400 }
        );
      }
    }

    // 4. Live Automated Google Maps Verification
    let autoVerifiedDetails = "";
    const expectedReviewer =
      reviewerName || (session.user as any)?.name || (session.user as any)?.email;

    try {
      const liveScrape = await scrapeGoogleMapsLiveReview(trimmedProofLink);
      if (liveScrape.success) {
        // A. Verify Reviewer Name Match
        if (liveScrape.reviewerName) {
          const nameMatches = isReviewerNameMatch(expectedReviewer, liveScrape.reviewerName);
          if (!nameMatches) {
            return NextResponse.json(
              {
                error: `Verification failed: Review on Google Maps was posted by "${liveScrape.reviewerName}", but your logged-in Google account is "${expectedReviewer}". You must post the review using your own Google account.`,
              },
              { status: 400 }
            );
          }
        }

        // B. Verify Shop Name Match
        if (liveScrape.shopName) {
          const titleNorm = targetTask.title.toLowerCase().replace(/[^a-z0-9]/g, "");
          const shopNorm = liveScrape.shopName.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (!titleNorm.includes(shopNorm) && !shopNorm.includes(titleNorm)) {
            return NextResponse.json(
              {
                error: `Verification failed: This Google review is for "${liveScrape.shopName}", not "${targetTask.title}".`,
              },
              { status: 400 }
            );
          }
        }

        // C. Verify Review Text Match
        if (assignedReviewText && liveScrape.reviewText) {
          const textMatches = isReviewTextMatch(assignedReviewText, liveScrape.reviewText);
          if (!textMatches) {
            return NextResponse.json(
              {
                error: `Verification failed: The review text on Google Maps does not match your assigned review text. Please copy and paste the exact assigned review text.`,
              },
              { status: 400 }
            );
          }
        }

        autoVerifiedDetails = `Auto-Verified: Reviewer="${liveScrape.reviewerName || expectedReviewer}", Shop="${liveScrape.shopName || targetTask.title}"`;
      }
    } catch (scrapeErr: any) {
      console.warn("Live scraper warning:", scrapeErr.message);
    }

    // 5. Fetch Settings for Verification Mode
    const setting =
      (await prisma.setting.findUnique({ where: { id: "default" } })) || {
        verificationMode: "AUTO",
      };

    const isAutoMode = setting.verificationMode === "AUTO";

    // 6. Atomic Database Transaction with auto-close logic
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

      const notes = autoVerifiedDetails
        ? `${autoVerifiedDetails}${assignedReviewText ? ` | Assigned: "${assignedReviewText}"` : ""}`
        : `Reviewer Name: ${expectedReviewer}${
            assignedReviewText ? ` | Assigned Review: "${assignedReviewText}"` : ""
          }`;

      // Create submission
      const submission = await tx.submission.create({
        data: {
          userId,
          taskId,
          proofLink: trimmedProofLink,
          status: isAutoMode ? "APPROVED" : "PENDING",
          rewardCredited: rewardAmount,
          adminNotes: notes,
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
