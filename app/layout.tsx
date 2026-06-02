import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeZilla - Trading Journal",
  description: "Multi-user trading journal platform",
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
