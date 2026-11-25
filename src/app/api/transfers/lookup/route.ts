import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/transfers/lookup?query=...
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();

    if (!query || query.length < 3) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: query.toLowerCase() },
          { userCode: query.toUpperCase() },
        ],
      },
      select: {
        id: true,
        userCode: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Do not return self as valid recipient
    const currentUserId = (session.user as any).id;
    if (user.id === currentUserId) {
      return NextResponse.json({
        user: null,
        isSelf: true,
        message: "You cannot transfer funds to your own account.",
      });
    }

    return NextResponse.json({
      user: {
        userCode: user.userCode,
        name: user.name || user.email.split("@")[0],
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("GET /api/transfers/lookup error:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
