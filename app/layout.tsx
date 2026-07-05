import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tradezilla.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TradeZilla - Premium Trading Journal & Analytics",
    template: "%s | TradeZilla"
  },
  description: "The ultimate cryptocurrency trading journal and portfolio tracker. Sync your Binance and Bitget trades automatically, analyze your performance, and improve your edge.",
  keywords: ["trading journal", "crypto portfolio", "binance sync", "bitget sync", "trading analytics", "crypto tracker"],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "TradeZilla - Premium Trading Journal",
    description: "Sync your exchange trades automatically, analyze your performance, and improve your edge.",
    url: "/",
    siteName: "TradeZilla",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TradeZilla Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeZilla - Premium Trading Journal",
    description: "Sync your exchange trades automatically, analyze your performance, and improve your edge.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
