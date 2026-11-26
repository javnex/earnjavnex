import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/transfers/lookup?query=...
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ user: null });
    }

    const currentUserId = (session.user as any).id;
    const cleanQuery = query.trim();

    // 1. Try fast HTTPS via Supabase (Port 443 - zero timeout)
    try {
      const supabase = getSupabaseAdmin();

      // Search by exact userCode or email (case-insensitive)
      const { data: exactMatches, error: exactErr } = await supabase
        .from("User")
        .select("id, userCode, name, email")
        .or(`email.ilike.${cleanQuery},userCode.ilike.${cleanQuery},id.eq.${cleanQuery}`)
        .limit(1);

      if (!exactErr && exactMatches && exactMatches.length > 0) {
        const found = exactMatches[0];
        if (found.id === currentUserId) {
          return NextResponse.json({
            user: null,
            isSelf: true,
            message: "You cannot transfer funds to your own account.",
          });
        }
        return NextResponse.json({
          user: {
            userCode: found.userCode,
            name: found.name || found.email.split("@")[0],
            email: found.email,
          },
        });
      }

      // If no exact match and query is 3+ chars, try partial match (e.g. typing part of email or code)
      if (cleanQuery.length >= 3) {
        const { data: partialMatches } = await supabase
          .from("User")
          .select("id, userCode, name, email")
          .or(`email.ilike.%${cleanQuery}%,userCode.ilike.%${cleanQuery}%`)
          .neq("id", currentUserId)
          .limit(1);

        if (partialMatches && partialMatches.length > 0) {
          const found = partialMatches[0];
          return NextResponse.json({
            user: {
              userCode: found.userCode,
              name: found.name || found.email.split("@")[0],
              email: found.email,
            },
          });
        }
      }
    } catch (supaErr) {
      console.warn("Supabase lookup fallback to prisma:", supaErr);
    }

    // 2. Fallback to Prisma if Supabase lookup has any error
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanQuery, mode: "insensitive" } },
          { userCode: { equals: cleanQuery, mode: "insensitive" } },
          { id: cleanQuery },
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
