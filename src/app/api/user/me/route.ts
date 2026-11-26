import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/user/me
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = (session.user as any).email;

    // 1. Try fast HTTPS query via Supabase (Port 443 - resilient against campus firewalls)
    try {
      const supabase = getSupabaseAdmin();
      const { data: supaUser } = await supabase
        .from("User")
        .select("id, userCode, name, email, role, walletBalance, isWithdrawing")
        .or(`id.eq.${userId},email.eq.${userEmail}`)
        .maybeSingle();

      if (supaUser) {
        const safeRole = isAdminEmail(supaUser.email) ? supaUser.role : "USER";
        return NextResponse.json({
          user: {
            ...supaUser,
            role: safeRole,
          },
        });
      }
    } catch (supaErr) {
      console.warn("Supabase user/me fallback to prisma:", supaErr);
    }

    // 2. Fallback to Prisma
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
