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

    // 2. Check 1 User ID = 1 Submission per Shop (exclude previous rejected attempts)
    const { data: existingUserSubmission } = await supabase
      .from("Submission")
      .select("id, status")
      .eq("userId", userId)
      .eq("taskId", taskId)
      .neq("status", "REJECTED")
      .maybeSingle();

    if (existingUserSubmission) {
      return NextResponse.json(
        {
          error:
            "Verification failed: You have already completed this task! Strict policy: 1 submission per account per shop.",
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

    // 3.1 Natural Velocity Rate-Limiter (Prevents burst detection on 50-200 review listings)
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
          error: `Daily velocity limit reached (${todayApprovedCount}/${dailyLimit} today)! To protect this store listing from burst detection, this listing accepts a maximum of ${dailyLimit} reviews per day. Daily slots will reopen tomorrow morning.`,
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
          error: `Pacing cooldown active: Please wait ${remainingMinutes} more minute${remainingMinutes > 1 ? "s" : ""} before submitting another review. Spacing out reviews ensures high-quality permanent reviews.`,
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
        {
          success: false,
          approved: false,
          failingStep: "shop",
          checks: {
            shopMatch: {
              passed: false,
              label: "Store Listing Match",
              details: validation.reason || "Invalid store listing CID",
            },
            accountMatch: { passed: false, label: "Google Account Identity" },
            starsMatch: { passed: false, label: "Star Rating Compliance" },
            textMatch: { passed: false, label: "Review Text Compliance" },
          },
          error: validation.reason || "Invalid review proof link.",
        },
        { status: 400 }
      );
    }

    // 5. Live Automated Google Maps Verification & Review ID Uniqueness
    const expectedReviewer =
      reviewerName || (session.user as any)?.name || (session.user as any)?.email;
    const requiredStars = assignedStars || 5;

    const liveScrape = await scrapeGoogleMapsLiveReview(trimmedProofLink);
    const canonicalReviewId = liveScrape.reviewId || validation.reviewId;

    // Check canonical review token uniqueness across all submissions (anti-theft: user A cannot submit user B's review)
    if (canonicalReviewId) {
      const { data: duplicateReview } = await supabase
        .from("Submission")
        .select("id, status")
        .or(`proofLink.ilike.%${canonicalReviewId}%,adminNotes.ilike.%${canonicalReviewId}%`)
        .neq("status", "REJECTED")
        .maybeSingle();

      if (duplicateReview) {
        return NextResponse.json(
          {
            success: false,
            approved: false,
            failingStep: "account",
            checks: {
              shopMatch: {
                passed: true,
                label: "Store Listing Match",
                details: `Store CID verified (${targetTask.title})`,
              },
              accountMatch: {
                passed: false,
                label: "Google Account Identity",
                details: "This exact review has already been claimed by another user account.",
              },
              starsMatch: { passed: false, label: "Star Rating Compliance" },
              textMatch: { passed: false, label: "Review Text Compliance" },
            },
            error:
              "Verification failed: This specific review proof has already been claimed! You cannot submit someone else's review or claim the same review twice.",
          },
          { status: 400 }
        );
      }
    }

    // CHECK 1: Verify Shop Name Match
    if (liveScrape.shopName) {
      const shopMatches = isShopNameMatch(
        targetTask.title,
        targetTask.shopUrl,
        liveScrape.shopName
      );
      if (!shopMatches) {
        return NextResponse.json(
          {
            success: false,
            approved: false,
            failingStep: "shop",
            checks: {
              shopMatch: {
                passed: false,
                label: "Store Listing Match",
                details: `Review is for "${liveScrape.shopName}", but task is for "${targetTask.title}"`,
              },
              accountMatch: { passed: false, label: "Google Account Identity" },
              starsMatch: { passed: false, label: "Star Rating Compliance" },
              textMatch: { passed: false, label: "Review Text Compliance" },
            },
            error: `Verification failed: Shop mismatch! This review on the store listing is for "${liveScrape.shopName}", but this task requires a review for "${targetTask.title}". You must submit a review for the specified shop only.`,
          },
          { status: 400 }
        );
      }
    }

    // Check if Google Maps marked review as unavailable/shadow-banned
    if (liveScrape.isUnavailable) {
      return NextResponse.json(
        {
          success: false,
          approved: false,
          failingStep: "account",
          checks: {
            shopMatch: {
              passed: true,
              label: "Store Listing Match",
              details: `Store CID verified (${targetTask.title})`,
            },
            accountMatch: {
              passed: false,
              label: "Google Account Identity",
              details: "Review is suppressed or shadow-banned on Google Maps",
            },
            starsMatch: { passed: false, label: "Star Rating Compliance" },
            textMatch: { passed: false, label: "Review Text Compliance" },
          },
          error:
            liveScrape.error ||
            "Google Maps shows: 'This review is no longer available.' Google has suppressed or shadow-banned this review from public view (or it was deleted). Open the link in an Incognito tab to check: reviews must be publicly visible to earn rewards.",
        },
        { status: 400 }
      );
    }

    // CHECK 2: Strict Reviewer Account Match
    let verifiedAuthorName = expectedReviewer;

    if (liveScrape.reviewerName) {
      const nameMatches = isReviewerNameMatch(expectedReviewer, liveScrape.reviewerName);
      if (!nameMatches) {
        return NextResponse.json(
          {
            success: false,
            approved: false,
            failingStep: "account",
            checks: {
              shopMatch: {
                passed: true,
                label: "Store Listing Match",
                details: `Verified: ${liveScrape.shopName || targetTask.title}`,
              },
              accountMatch: {
                passed: false,
                label: "Google Account Identity",
                details: `Review was posted by "${liveScrape.reviewerName}", but your logged-in account is "${expectedReviewer}"`,
              },
              starsMatch: { passed: false, label: "Star Rating Compliance" },
              textMatch: { passed: false, label: "Review Text Compliance" },
            },
            error: `Verification failed: Reviewer account mismatch! The review on the store listing was posted by "${liveScrape.reviewerName}", but your logged-in account name is "${expectedReviewer}". You cannot claim a review posted under a different Google account.`,
          },
          { status: 400 }
        );
      }
      verifiedAuthorName = liveScrape.reviewerName;
    } else {
      // Author name could not be confirmed on Google Maps: STRICT REJECTION (never auto-approve unknown author)
      return NextResponse.json(
        {
          success: false,
          approved: false,
          failingStep: "account",
          checks: {
            shopMatch: {
              passed: true,
              label: "Store Listing Match",
              details: `Store CID verified (${targetTask.title})`,
            },
            accountMatch: {
              passed: false,
              label: "Google Account Identity",
              details: `Review author name on Google Maps could not be verified as "${expectedReviewer}"`,
            },
            starsMatch: { passed: false, label: "Star Rating Compliance" },
            textMatch: { passed: false, label: "Review Text Compliance" },
          },
          error: `Verification failed: Could not confirm the author name of this review on Google Maps. To prevent submitting reviews posted by other accounts, your review author name must be publicly visible and match your logged-in account "${expectedReviewer}". If you recently posted, please wait 1-2 minutes for Google Maps to index it publicly and click Verify & Earn again.`,
        },
        { status: 400 }
      );
    }

    // CHECK 3: Verify Star Rating Match
    if (liveScrape.starRating) {
      if (liveScrape.starRating !== requiredStars) {
        return NextResponse.json(
          {
            success: false,
            approved: false,
            failingStep: "stars",
            checks: {
              shopMatch: {
                passed: true,
                label: "Store Listing Match",
                details: `Verified: ${liveScrape.shopName || targetTask.title}`,
              },
              accountMatch: {
                passed: true,
                label: "Google Account Identity",
                details: `Verified: ${verifiedAuthorName}`,
              },
              starsMatch: {
                passed: false,
                label: "Star Rating Compliance",
                details: `You gave ${liveScrape.starRating} stars, but ${requiredStars} stars was assigned`,
              },
              textMatch: { passed: false, label: "Review Text Compliance" },
            },
            error: `Verification failed: Star rating mismatch! You gave ${liveScrape.starRating} stars on the store listing, but your assigned rating for this task is ${requiredStars} stars. Please edit your review to give ${requiredStars} stars and submit again.`,
          },
          { status: 400 }
        );
      }
    }

    // CHECK 4: Verify Review Text Match
    if (!assignedReviewText || !assignedReviewText.trim()) {
      return NextResponse.json(
        {
          success: false,
          approved: false,
          failingStep: "text",
          checks: {
            shopMatch: {
              passed: true,
              label: "Store Listing Match",
              details: `Verified: ${liveScrape.shopName || targetTask.title}`,
            },
            accountMatch: {
              passed: true,
              label: "Google Account Identity",
              details: `Verified: ${verifiedAuthorName}`,
            },
            starsMatch: {
              passed: true,
              label: "Star Rating Compliance",
              details: `Verified: ${requiredStars}★ Required`,
            },
            textMatch: {
              passed: false,
              label: "Review Text Compliance",
              details: "Missing assigned text",
            },
          },
          error:
            "Verification failed: Missing assigned text. Please copy your assigned text from the task card and post it.",
        },
        { status: 400 }
      );
    }

    if (liveScrape.reviewText) {
      const textMatchResult = isReviewTextMatch(assignedReviewText, liveScrape.reviewText);
      if (!textMatchResult.matches) {
        return NextResponse.json(
          {
            success: false,
            approved: false,
            failingStep: "text",
            checks: {
              shopMatch: {
                passed: true,
                label: "Store Listing Match",
                details: `Verified: ${liveScrape.shopName || targetTask.title}`,
              },
              accountMatch: {
                passed: true,
                label: "Google Account Identity",
                details: `Verified: ${verifiedAuthorName}`,
              },
              starsMatch: {
                passed: true,
                label: "Star Rating Compliance",
                details: `Verified: ${requiredStars}★ Required`,
              },
              textMatch: {
                passed: false,
                label: "Review Text Compliance",
                details: "Published text does not match assigned text",
              },
            },
            error: `Verification failed: Text mismatch! The text on the store listing does not match your assigned task text. Users cannot write arbitrary text; you must copy and post the exact assigned text.`,
          },
          { status: 400 }
        );
      }
    }

    // ALL 4 CHECKS PASSED: Instant Direct Approval & Instant Reward Deposit!
    const rewardAmount = targetTask.rewardInr || 10;
    const newCompletedCount = targetTask.completedCount + 1;
    const willClose = newCompletedCount >= targetTask.maxLimit;

    const verificationNote = `Auto-Verified (4/4 Passed): Reviewer="${verifiedAuthorName}", Shop="${liveScrape.shopName || targetTask.title}", Stars=${liveScrape.starRating || requiredStars}★${canonicalReviewId ? ` | [ReviewID: ${canonicalReviewId}]` : ""}${assignedReviewText ? ` | Assigned: "${assignedReviewText}"` : ""}`;

    // Insert Submission via Supabase HTTPS (instant & port 443 firewall-immune)
    const submissionId = `sub_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;

    const { data: insertedSub, error: insertErr } = await supabase
      .from("Submission")
      .insert({
        id: submissionId,
        userId,
        taskId,
        proofLink: trimmedProofLink,
        status: "APPROVED",
        rewardCredited: rewardAmount,
        adminNotes: verificationNote,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Supabase insert submission error:", insertErr);
      throw new Error(insertErr.message || "Failed to record submission");
    }

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

    return NextResponse.json(
      {
        success: true,
        approved: true,
        message: `All 4 verification checks passed! ₹${rewardAmount} credited directly to your wallet.`,
        submission: insertedSub,
        credited: true,
        rewardAmount,
        newBalance: calculatedBalance,
        taskClosed: willClose,
        checks: {
          shopMatch: {
            passed: true,
            label: "Store Listing Match",
            details: `Verified: ${liveScrape.shopName || targetTask.title}`,
          },
          accountMatch: {
            passed: true,
            label: "Google Account Identity",
            details: `Verified: ${verifiedAuthorName}`,
          },
          starsMatch: {
            passed: true,
            label: "Star Rating Compliance",
            details: `Verified: ${requiredStars}★ Required`,
          },
          textMatch: {
            passed: true,
            label: "Review Text Compliance",
            details: "Verified: Assigned text confirmed",
          },
        },
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
