import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockOnChain",
  description: "A prototype for clearer stokvel savings records.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "StockOnChain",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f7f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
