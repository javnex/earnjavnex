import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

const handler = (req: NextRequest, ctx: any) => {
  return NextAuth(req, ctx, getAuthOptions());
};

export { handler as GET, handler as POST };
