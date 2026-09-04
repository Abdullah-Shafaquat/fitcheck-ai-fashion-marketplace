import Block404 from "@/Components/NotFound/Block404";

export const metadata = {
  title: "404 — Page Not Found | FitCheck",
  description:
    "The page you're looking for doesn't exist or may have been moved. Explore the latest fashion at FitCheck.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return <Block404 />;
}