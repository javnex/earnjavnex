import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Available Tasks",
  description:
    "Browse active micro-tasks, complete verified shop tasks, and earn instant INR credits to your EarnReward wallet.",
  alternates: {
    canonical: "/dashboard/tasks",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
