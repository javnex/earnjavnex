import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import { broadcastNewTaskAlert } from "@/lib/mailer";
import {
  extractTaskTargetRating,
  extractTaskDailyLimit,
  cleanTaskInstructions,
  formatTaskInstructions,
  getAssignedStarRating,
} from "@/lib/rating-balancer";
import { generateAiReviewText } from "@/lib/review-generator";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  shopUrl: z.string().url("Must be a valid URL"),
  instructions: z.string().min(5, "Instructions must be provided"),
  rewardInr: z.number().positive().default(10),
  maxLimit: z.number().int().positive("Max limit must be at least 1"),
  targetRating: z.number().min(3.0).max(5.0).default(4.5).optional(),
  dailyLimit: z.number().int().min(1).max(20).default(2).optional(),
});

// GET /api/tasks
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("all") === "true";

    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    const userEmail = (session?.user as any)?.email;

    // 1. Try fast HTTPS query via Supabase (Port 443 - resilient against campus firewalls)
    try {
      const supabase = getSupabaseAdmin();

      // Query today's approved submissions count for velocity rate limiting
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todaySubs } = await supabase
        .from("Submission")
        .select("taskId")
        .gte("createdAt", todayStart.toISOString())
        .eq("status", "APPROVED");

      const todayCounts: Record<string, number> = {};
      todaySubs?.forEach((s: any) => {
        todayCounts[s.taskId] = (todayCounts[s.taskId] || 0) + 1;
      });

      if (showAll && userRole === "ADMIN" && isAdminEmail(userEmail)) {
        const { data: allTasks } = await supabase
          .from("Task")
          .select("*")
          .order("createdAt", { ascending: false });
        if (allTasks) {
          const withRating = allTasks.map((t: any) => ({
            ...t,
            targetRating: extractTaskTargetRating(t),
            dailyLimit: extractTaskDailyLimit(t),
            todayCompletedCount: todayCounts[t.id] || 0,
          }));
          return NextResponse.json({ tasks: withRating });
        }
      } else {
        const { data: activeTasks } = await supabase
          .from("Task")
          .select("*")
          .eq("status", "ACTIVE")
          .order("createdAt", { ascending: false });

        if (activeTasks) {
          const userSubmittedTaskIds: string[] = [];
          if (userId) {
            const { data: userSubs } = await supabase
              .from("Submission")
              .select("taskId")
              .eq("userId", userId);
            userSubs?.forEach((s: any) => userSubmittedTaskIds.push(s.taskId));
          }
          const filtered = await Promise.all(
            activeTasks
              .filter((t: any) => {
                // Must not be completed overall
                if (t.completedCount >= t.maxLimit) return false;
                // User must not have submitted for this shop
                if (userSubmittedTaskIds.includes(t.id)) return false;

                // Natural Velocity Pacing: Filter out if today's organic daily limit is reached!
                const dailyLimit = extractTaskDailyLimit(t);
                const todayDone = todayCounts[t.id] || 0;
                if (todayDone >= dailyLimit) return false;

                return true;
              })
              .map(async (t: any) => {
                const targetRating = extractTaskTargetRating(t);
                const dailyLimit = extractTaskDailyLimit(t);
                const todayDone = todayCounts[t.id] || 0;
                const { rating: assignedStars } = getAssignedStarRating({
                  taskId: t.id,
                  userId: userId || "guest",
                  totalReviews: t.maxLimit,
                  targetRating,
                });
                const assignedReview = await generateAiReviewText(
                  t.title,
                  userId || "guest",
                  assignedStars
                );
                return {
                  ...t,
                  instructions: cleanTaskInstructions(t.instructions),
                  targetRating,
                  dailyLimit,
                  todayCompletedCount: todayDone,
                  assignedStars,
                  assignedReview,
                };
              })
          );
          return NextResponse.json({ tasks: filtered });
        }
      }
    } catch (supaErr) {
      console.warn("Supabase tasks fallback to prisma:", supaErr);
    }

    if (showAll && userRole === "ADMIN" && isAdminEmail(userEmail)) {
      // Admin view of all tasks
      const tasks = await prisma.task.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { submissions: true },
          },
        },
      });
      return NextResponse.json({ tasks });
    }

    // User view: only ACTIVE tasks where completedCount < maxLimit
    // and logged-in user hasn't submitted yet
    const userSubmittedTaskIds: string[] = [];
    if (userId) {
      const userSubmissions = await prisma.submission.findMany({
        where: { userId },
        select: { taskId: true },
      });
      userSubmissions.forEach((s) => userSubmittedTaskIds.push(s.taskId));
    }

    const availableTasks = await prisma.task.findMany({
      where: {
        status: "ACTIVE",
        id: { notIn: userSubmittedTaskIds },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter out any task where completedCount >= maxLimit
    const filteredTasks = availableTasks.filter(
      (task) => task.completedCount < task.maxLimit
    );

    return NextResponse.json({ tasks: filteredTasks });
  } catch (error: any) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to load tasks" },
      { status: 500 }
    );
  }
}

// POST /api/tasks (Admin only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = (session?.user as any)?.email;
    if (!session || (session.user as any)?.role !== "ADMIN" || !isAdminEmail(email)) {
      return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { title, shopUrl, instructions, rewardInr, maxLimit, targetRating, dailyLimit } = parsed.data;
    const finalRating = targetRating ?? 4.5;
    const finalDailyLimit = dailyLimit ?? 2;
    const formattedInstructions = formatTaskInstructions(instructions, finalRating, finalDailyLimit);

    try {
      const supabase = getSupabaseAdmin();
      const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      const { data: supaTask, error: tErr } = await supabase
        .from("Task")
        .insert({
          id: taskId,
          title,
          shopUrl,
          instructions: formattedInstructions,
          rewardInr,
          maxLimit,
          completedCount: 0,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (!tErr && supaTask) {
        // Trigger asynchronous new task alert to opted-in users
        (async () => {
          try {
            const supabase = getSupabaseAdmin();
            const { data: supaUsers } = await supabase
              .from("User")
              .select("email, name")
              .neq("task_alerts_enabled", false);
            if (supaUsers && supaUsers.length > 0) {
              await broadcastNewTaskAlert(supaUsers, {
                taskId: supaTask.id,
                title,
                rewardInr,
                instructions: formattedInstructions,
              });
            }
          } catch (err) {
            console.error("Task alert broadcast error:", err);
          }
        })();

        return NextResponse.json(
          { task: { ...supaTask, targetRating: finalRating, dailyLimit: finalDailyLimit } },
          { status: 201 }
        );
      }
    } catch (supaErr) {
      console.warn("Supabase create task fallback to prisma:", supaErr);
    }

    const task = await prisma.task.create({
      data: {
        title,
        shopUrl,
        instructions: formattedInstructions,
        rewardInr,
        maxLimit,
        completedCount: 0,
        status: "ACTIVE",
      },
    });

    // Trigger asynchronous new task alert to opted-in users (Prisma fallback)
    (async () => {
      try {
        const pUsers = await prisma.user.findMany({
          where: { task_alerts_enabled: true },
          select: { email: true, name: true },
        });
        if (pUsers.length > 0) {
          await broadcastNewTaskAlert(pUsers, {
            taskId: task.id,
            title,
            rewardInr,
            instructions: formattedInstructions,
          });
        }
      } catch (err) {
        console.error("Task alert broadcast error:", err);
      }
    })();

    return NextResponse.json(
      { task: { ...task, targetRating: finalRating, dailyLimit: finalDailyLimit } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
