import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import CookieBanner from "@/components/CookieBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXTAUTH_URL || "https://earn.javnex.in";

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  referrer: "no-referrer",
  title: {
    default: "ReviewReward - Earn ₹100+ Reviewing Online Shops | Fast ₹100 Payouts",
    template: "%s | ReviewReward",
  },
  description:
    "Earn ₹10 per verified shop review. Pool balances across multiple accounts with ₹0-fee internal transfers and cash out directly once your wallet hits ₹100. Compliant with India DPDP Act 2023.",
  keywords: [
    "review rewards",
    "micro-task terminal",
    "earn money online india",
    "shop review tasks",
    "zero fee internal transfers",
    "fast 100 payouts",
    "DPDP compliant task platform",
  ],
  authors: [{ name: "ReviewReward Team" }],
  creator: "ReviewReward",
  publisher: "ReviewReward",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ReviewReward - Earn ₹100+ Reviewing Online Shops | Fast ₹100 Payouts",
    description:
      "Earn ₹10 per verified review. Zero-fee account pooling transfers. Automated fast ₹100 cashouts directly to your bank account.",
    url: siteUrl,
    siteName: "ReviewReward",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReviewReward - Earn ₹100+ Reviewing Online Shops",
    description:
      "Earn ₹10 per verified review. Pool balances with ₹0 fees. Fast ₹100 cashouts.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light scroll-smooth">
      <body
        className={`${geistSans.variable} min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white`}
      >
        {/* Accessible Skip to Content Link (WCAG 2.2 AA) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:font-bold focus:rounded-xl focus:shadow-2xl focus:outline-none"
        >
          Skip to main content
        </a>

        <SessionProvider>
          {children}
          <CookieBanner />
        </SessionProvider>
      </body>
    </html>
  );
}
