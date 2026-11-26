import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";

export function generateUserCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "USR-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Strict Security: ONLY javnexreview@gmail.com is permitted as ADMIN
 */
export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    normalized === "javnexreview@gmail.com" ||
    normalized === "javnex.review@gmail.com"
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        const email = user.email.toLowerCase();
        const properRole = isAdminEmail(email) ? "ADMIN" : "USER";

        // Try Supabase HTTPS (Port 443 - resilient against campus/restricted Wi-Fi firewalls)
        try {
          const supabase = getSupabaseAdmin();
          const { data: existingUser } = await supabase
            .from("User")
            .select("*")
            .eq("email", email)
            .maybeSingle();

          if (!existingUser) {
            let userCode = generateUserCode();
            let { data: codeExists } = await supabase
              .from("User")
              .select("id")
              .eq("userCode", userCode)
              .maybeSingle();

            while (codeExists) {
              userCode = generateUserCode();
              const res = await supabase
                .from("User")
                .select("id")
                .eq("userCode", userCode)
                .maybeSingle();
              codeExists = res.data;
            }

            await supabase.from("User").insert({
              id: "cmw" + Math.random().toString(36).substring(2, 14),
              email,
              name: user.name || email.split("@")[0],
              avatarUrl: user.image,
              role: properRole,
              userCode,
              walletBalance: 0.0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            if (existingUser.role !== properRole) {
              await supabase
                .from("User")
                .update({ role: properRole, updatedAt: new Date().toISOString() })
                .eq("email", email);
            }
          }
          return true;
        } catch (supabaseErr) {
          console.warn("Supabase auth sync fallback to prisma:", supabaseErr);
        }

        // Fallback to Prisma
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (!existingUser) {
            let userCode = generateUserCode();
            let codeExists = await prisma.user.findUnique({ where: { userCode } });
            while (codeExists) {
              userCode = generateUserCode();
              codeExists = await prisma.user.findUnique({ where: { userCode } });
            }

            await prisma.user.create({
              data: {
                email,
                name: user.name || email.split("@")[0],
                avatarUrl: user.image,
                role: properRole,
                userCode,
                walletBalance: 0.0,
              },
            });
          } else {
            if (existingUser.role !== properRole) {
              await prisma.user.update({
                where: { email },
                data: { role: properRole },
              });
            }
          }
        } catch (prismaErr) {
          console.error("Prisma auth fallback error:", prismaErr);
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "USER";
        token.userCode = (user as any).userCode || "";
        token.walletBalance = (user as any).walletBalance ?? 0;
      }

      if (trigger === "update" && session) {
        if (session.walletBalance !== undefined) {
          token.walletBalance = session.walletBalance;
        }
        if (session.name !== undefined) {
          token.name = session.name;
        }
      }

      if (token.email) {
        // Try Supabase HTTPS lookup (Port 443)
        try {
          const supabase = getSupabaseAdmin();
          const { data: freshUser } = await supabase
            .from("User")
            .select("id, role, userCode, walletBalance")
            .eq("email", (token.email as string).toLowerCase())
            .maybeSingle();

          if (freshUser) {
            token.id = freshUser.id;
            token.role = isAdminEmail(token.email as string) ? "ADMIN" : "USER";
            token.userCode = freshUser.userCode;
            token.walletBalance = freshUser.walletBalance;
            return token;
          }
        } catch {
          // Fallback to Prisma
        }

        try {
          const freshUser = await prisma.user.findUnique({
            where: { email: (token.email as string).toLowerCase() },
            select: { id: true, role: true, userCode: true, walletBalance: true },
          });
          if (freshUser) {
            token.id = freshUser.id;
            token.role = isAdminEmail(token.email as string) ? "ADMIN" : "USER";
            token.userCode = freshUser.userCode;
            token.walletBalance = freshUser.walletBalance;
          }
        } catch {
          // fallback gracefully
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).userCode = token.userCode;
        (session.user as any).walletBalance = token.walletBalance;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "reviewreward-super-secret-key-production-32chars",
};

export default authOptions;
