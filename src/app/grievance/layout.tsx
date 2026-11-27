import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grievance Redressal",
  description:
    "File statutory data grievances or contact the Data Protection Officer under India DPDP Act 2023 for EarnReward.",
  alternates: {
    canonical: "/grievance",
  },
};

export default function GrievanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
