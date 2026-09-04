import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the FitCheck team — customer support, order help, returns and more. We're here to help.",
  alternates: { canonical: "/contact" },
  openGraph: { type: "website", title: "Contact Us | FitCheck", url: `${siteUrl()}/contact`, siteName: "FitCheck" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
