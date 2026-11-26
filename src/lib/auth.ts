import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

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
        const role = isAdminEmail(email) ? "ADMIN" : "USER";

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
              role,
              userCode,
              walletBalance: 0.0,
            },
          });
        } else {
          // Strict Role Sync: ONLY javnexreview@gmail.com can hold ADMIN
          const properRole = isAdminEmail(email) ? "ADMIN" : "USER";
          if (existingUser.role !== properRole) {
            await prisma.user.update({
              where: { email },
              data: { role: properRole },
            });
          }
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
        try {
          const freshUser = await prisma.user.findUnique({
            where: { email: (token.email as string).toLowerCase() },
            select: { id: true, role: true, userCode: true, walletBalance: true },
          });
          if (freshUser) {
            token.id = freshUser.id;
            // Strict role guard: only authorized email can be admin
            token.role = isAdminEmail(token.email as string)
              ? "ADMIN"
              : "USER";
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
