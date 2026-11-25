import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  shopUrl: z.string().url("Must be a valid URL"),
  instructions: z.string().min(5, "Instructions must be provided"),
  rewardInr: z.number().positive().default(10),
  maxLimit: z.number().int().positive("Max limit must be at least 1"),
});

// GET /api/tasks
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("all") === "true";

    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (showAll && userRole === "ADMIN") {
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
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { title, shopUrl, instructions, rewardInr, maxLimit } = parsed.data;

    const task = await prisma.task.create({
      data: {
        title,
        shopUrl,
        instructions,
        rewardInr,
        maxLimit,
        completedCount: 0,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
