import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Sign In",
  description:
    "Sign in to your EarnReward portal to access daily micro-tasks, view wallet earnings, and request bank payouts.",
  alternates: {
    canonical: "/auth/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
