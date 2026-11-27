import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transaction History",
  description:
    "Review your complete audit trail of completed tasks, wallet deposits, peer transfers, and payout requests.",
  alternates: {
    canonical: "/dashboard/history",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
