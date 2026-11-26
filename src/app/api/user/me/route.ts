import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/user/me
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userCode: true,
        name: true,
        email: true,
        role: true,
        walletBalance: true,
        isWithdrawing: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Strict security: ensure role reflects admin email authorization
    const safeRole = isAdminEmail(user.email) ? user.role : "USER";

    return NextResponse.json({
      user: {
        ...user,
        role: safeRole,
      },
    });
  } catch (error: any) {
    console.error("GET /api/user/me error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
