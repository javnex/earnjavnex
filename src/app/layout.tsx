import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReviewReward - Micro-Task & Review Rewards | Instant USDT Payouts",
  description:
    "Earn ₹10 per verified shop review. Pool balances across multiple accounts with ₹0-fee internal transfers and withdraw instantly to Polygon USDT with guaranteed ₹100 bank cash-out buffer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
