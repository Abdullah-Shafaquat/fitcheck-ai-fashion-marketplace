import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { siteUrl, siteName, siteTagline } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "FitCheck | Fashion & Clothing Store",
    template: "%s | FitCheck",
  },
  description: siteTagline(),
  applicationName: siteName(),
  keywords: [
    "FitCheck",
    "fashion",
    "clothing",
    "online shopping",
    "women's fashion",
    "men's fashion",
    "shoes",
    "accessories",
  ],
  icons: {
    icon: "/logos/top-logo.png",
  },
  openGraph: {
    type: "website",
    siteName: siteName(),
    title: "FitCheck | Fashion & Clothing Store",
    description: siteTagline(),
    url: "/",
    images: [{ url: "/logos/top-logo.png", width: 512, height: 512, alt: siteName() }],
  },
  twitter: {
    card: "summary",
    title: "FitCheck | Fashion & Clothing Store",
    description: siteTagline(),
    images: ["/logos/top-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF6B35",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-white text-secondary">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}