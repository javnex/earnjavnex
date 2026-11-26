import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  verifyGoogleReviewMatch,
  scrapeGoogleMapsLiveReview,
  isReviewerNameMatch,
  isReviewTextMatch,
  isShopNameMatch,
} from "@/lib/google-maps";
import { extractTaskDailyLimit } from "@/lib/rating-balancer";
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
  assignedStars: z.number().int().min(3).max(5).optional(),
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

    // Primary: Query via Supabase HTTPS (Port 443 - resilient against campus firewalls)
    try {
      const supabase = getSupabaseAdmin();

      if (userRole === "ADMIN" && isAdminEmail(userEmail)) {
        let query = supabase
          .from("Submission")
          .select("*, task:Task(title, shopUrl, rewardInr), user:User(name, email, userCode)")
          .order("createdAt", { ascending: false });

        if (statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(statusFilter)) {
          query = query.eq("status", statusFilter);
        }

        const { data: adminSubs, error: aErr } = await query;
        if (!aErr && adminSubs) {
          return NextResponse.json({ submissions: adminSubs });
        }
      } else {
        const { data: userSubs, error: uErr } = await supabase
          .from("Submission")
          .select("*, task:Task(title, shopUrl, rewardInr)")
          .eq("userId", userId)
          .order("createdAt", { ascending: false });

        if (!uErr && userSubs) {
          return NextResponse.json({ submissions: userSubs });
        }
      }
    } catch (supaErr) {
      console.warn("Supabase GET submissions fallback to prisma:", supaErr);
    }

    // Fallback: Prisma query
    if (userRole === "ADMIN" && isAdminEmail(userEmail)) {
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

// POST /api/submissions - Submit a review link with automated verification
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

    const { taskId, proofLink, assignedReviewText, reviewerName, assignedStars } = parsed.data;
    const trimmedProofLink = proofLink.trim();
    const supabase = getSupabaseAdmin();

    // 1. Check Global Proof Link Uniqueness (prevent reusing the same URL across all users)
    const { data: duplicateProof } = await supabase
      .from("Submission")
      .select("id")
      .eq("proofLink", trimmedProofLink)
      .maybeSingle();

    if (duplicateProof) {
      return NextResponse.json(
        {
          error:
            "Verification failed: This review link has already been submitted and claimed. Every review proof link must be unique.",
        },
        { status: 400 }
      );
    }

    // 2. Check 1 User ID = 1 Submission per Shop
    const { data: existingUserSubmission } = await supabase
      .from("Submission")
      .select("id")
      .eq("userId", userId)
      .eq("taskId", taskId)
      .maybeSingle();

    if (existingUserSubmission) {
      return NextResponse.json(
        {
          error:
            "Verification failed: You have already completed this task! Strict policy: 1 submission per Google account per shop.",
        },
        { status: 400 }
      );
    }

    // 3. Verify Target Task
    const { data: targetTask } = await supabase
      .from("Task")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (!targetTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (targetTask.status !== "ACTIVE" || targetTask.completedCount >= targetTask.maxLimit) {
      return NextResponse.json(
        { error: "This task has reached its maximum limit and is now closed." },
        { status: 400 }
      );
    }

    // 3.1 Natural Velocity Rate-Limiter (Prevents Google burst detection on 50-200 review listings)
    const dailyLimit = extractTaskDailyLimit(targetTask);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayApprovedCount } = await supabase
      .from("Submission")
      .select("*", { count: "exact", head: true })
      .eq("taskId", taskId)
      .eq("status", "APPROVED")
      .gte("createdAt", todayStart.toISOString());

    if ((todayApprovedCount || 0) >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Daily velocity limit reached (${todayApprovedCount}/${dailyLimit} today)! To protect this Google Business Profile from burst detection, this listing accepts a maximum of ${dailyLimit} reviews per day. Daily slots will reopen tomorrow morning.`,
        },
        { status: 400 }
      );
    }

    // 3.2 User Account Cooldown (10 minutes between submissions to avoid coordinated review ring flags)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const { data: recentUserSub } = await supabase
      .from("Submission")
      .select("createdAt")
      .eq("userId", userId)
      .gte("createdAt", tenMinutesAgo.toISOString())
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentUserSub) {
      const elapsedMinutes = Math.floor(
        (Date.now() - new Date(recentUserSub.createdAt).getTime()) / 60000
      );
      const remainingMinutes = Math.max(1, 10 - elapsedMinutes);
      return NextResponse.json(
        {
          error: `Pacing cooldown active: Please wait ${remainingMinutes} more minute${remainingMinutes > 1 ? "s" : ""} before submitting another review. Spacing out reviews protects your personal Google account and ensures permanent reviews.`,
        },
        { status: 400 }
      );
    }

    // 4. Anti-Cheat: Validate that proofLink is an individual review belonging to this shop
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
      const { data: duplicateReview } = await supabase
        .from("Submission")
        .select("id")
        .ilike("proofLink", `%${validation.reviewId}%`)
        .maybeSingle();

      if (duplicateReview) {
        return NextResponse.json(
          {
            error:
              "Verification failed: This specific Google review has already been claimed! You cannot reuse the same review.",
          },
          { status: 400 }
        );
      }
    }

    // 5. Live Automated Google Maps Verification
    const expectedReviewer =
      reviewerName || (session.user as any)?.name || (session.user as any)?.email;

    const liveScrape = await scrapeGoogleMapsLiveReview(trimmedProofLink);

    if (!liveScrape.success) {
      return NextResponse.json(
        {
          error:
            "Verification failed: Could not load review details from Google Maps. If you just posted it, Google Maps may take 1-2 minutes to publish it publicly. Please ensure your review is visible and try again.",
        },
        { status: 400 }
      );
    }

    // A. Verify Reviewer Name Match
    if (liveScrape.reviewerName) {
      const nameMatches = isReviewerNameMatch(expectedReviewer, liveScrape.reviewerName);
      if (!nameMatches) {
        return NextResponse.json(
          {
            error: `Verification failed: Reviewer name mismatch! The review on Google Maps was posted by "${liveScrape.reviewerName}", but your logged-in Google Account is "${expectedReviewer}". You must post the review using your own logged-in Google account.`,
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            "Verification failed: Could not detect the reviewer name on Google Maps. If you just posted your review, Google Maps may take 1-2 minutes to display it publicly. Please wait a moment and try again.",
        },
        { status: 400 }
      );
    }

    // B. Verify Shop Name Match (Anti-Cheat: Review must be for the designated shop)
    if (liveScrape.shopName) {
      const shopMatches = isShopNameMatch(
        targetTask.title,
        targetTask.shopUrl,
        liveScrape.shopName
      );
      if (!shopMatches) {
        return NextResponse.json(
          {
            error: `Verification failed: Shop mismatch! This review on Google Maps is for "${liveScrape.shopName}", but this task requires a review for "${targetTask.title}". You must submit a review for the specified shop only.`,
          },
          { status: 400 }
        );
      }
    }

    // C. Verify Review Text Match (Strict Anti-Cheat: Review must match assigned AI text)
    if (!assignedReviewText || !assignedReviewText.trim()) {
      return NextResponse.json(
        {
          error:
            "Verification failed: Missing assigned review text. Please copy your assigned review from the task card and post it.",
        },
        { status: 400 }
      );
    }

    if (!liveScrape.reviewText || !liveScrape.reviewText.trim()) {
      return NextResponse.json(
        {
          error:
            "Verification failed: Could not detect your review text on Google Maps. If you just posted it, Google Maps may take 1-2 minutes to display the text publicly. Please wait a moment and try again.",
        },
        { status: 400 }
      );
    }

    const textMatchResult = isReviewTextMatch(assignedReviewText, liveScrape.reviewText);
    if (!textMatchResult.matches) {
      return NextResponse.json(
        {
          error: `Verification failed: Review text mismatch! The review text on Google Maps does not match your assigned AI review text. Users cannot write arbitrary reviews; you must copy and post the exact assigned review text.`,
        },
        { status: 400 }
      );
    }

    // D. Verify Star Rating Match (Anti-Cheat: Review star rating must match assigned 3, 4, or 5 stars)
    if (assignedStars && liveScrape.starRating) {
      if (liveScrape.starRating !== assignedStars) {
        return NextResponse.json(
          {
            error: `Verification failed: Star rating mismatch! You gave ${liveScrape.starRating} stars on Google Maps, but your assigned rating for this task is ${assignedStars} stars. Please edit your review on Google Maps to give ${assignedStars} stars and submit again.`,
          },
          { status: 400 }
        );
      }
    }

    const autoVerifiedDetails = `Auto-Verified: Reviewer="${liveScrape.reviewerName || expectedReviewer}", Shop="${liveScrape.shopName || targetTask.title}", Stars=${liveScrape.starRating || assignedStars || 5}★`;

    // 6. Fetch Settings for Verification Mode
    const { data: setting } = await supabase
      .from("Setting")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    const isAutoMode = (setting?.verificationMode || "AUTO") === "AUTO";
    const rewardAmount = targetTask.rewardInr || 10;
    const newCompletedCount = isAutoMode
      ? targetTask.completedCount + 1
      : targetTask.completedCount;
    const willClose = newCompletedCount >= targetTask.maxLimit;

    const notes = `${autoVerifiedDetails}${
      assignedReviewText ? ` | Assigned: "${assignedReviewText}"` : ""
    }`;

    // 7. Insert Submission via Supabase HTTPS (instant & port 443 firewall-immune)
    const submissionId = `sub_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;

    const { data: insertedSub, error: insertErr } = await supabase
      .from("Submission")
      .insert({
        id: submissionId,
        userId,
        taskId,
        proofLink: trimmedProofLink,
        status: isAutoMode ? "APPROVED" : "PENDING",
        rewardCredited: rewardAmount,
        adminNotes: notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Supabase insert submission error:", insertErr);
      throw new Error(insertErr.message || "Failed to record submission");
    }

    let updatedWalletBalance: number | undefined = undefined;

    // 8. Auto-credit & Update Task Count if Auto Mode
    if (isAutoMode) {
      // Update Task completedCount & status
      await supabase
        .from("Task")
        .update({
          completedCount: newCompletedCount,
          status: willClose ? "CLOSED" : "ACTIVE",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", taskId);

      // Increment User wallet balance
      const { data: curUser } = await supabase
        .from("User")
        .select("walletBalance")
        .eq("id", userId)
        .single();

      const calculatedBalance = Number(
        ((curUser?.walletBalance || 0) + rewardAmount).toFixed(2)
      );

      await supabase
        .from("User")
        .update({
          walletBalance: calculatedBalance,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", userId);

      updatedWalletBalance = calculatedBalance;
    }

    return NextResponse.json(
      {
        success: true,
        message: isAutoMode
          ? `Review verified! ₹${rewardAmount} credited to your wallet.`
          : "Review submitted for verification. Reward will be credited upon approval.",
        submission: insertedSub,
        credited: isAutoMode,
        rewardAmount,
        newBalance: updatedWalletBalance,
        taskClosed: willClose,
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
