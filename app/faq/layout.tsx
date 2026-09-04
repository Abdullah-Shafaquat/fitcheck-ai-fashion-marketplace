import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers to common questions about ordering, shipping, returns, payments and more at FitCheck.",
  alternates: { canonical: "/faq" },
  openGraph: { type: "website", title: "FAQ | FitCheck", url: `${siteUrl()}/faq`, siteName: "FitCheck" },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
