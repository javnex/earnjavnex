import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Withdraw Funds",
  description:
    "Request fast payouts to your bank account or Polygon USDT wallet once your EarnReward balance reaches ₹100.",
  alternates: {
    canonical: "/dashboard/withdraw",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WithdrawLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
