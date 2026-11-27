import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transfer Credits",
  description:
    "Instantly transfer your task reward credits to other EarnReward users with zero fees and pooled balances.",
  alternates: {
    canonical: "/dashboard/transfer",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function TransferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
