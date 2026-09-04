import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import CollectionBanners from "@/Components/HomePage/Sections/CollectionBanners";
import FeaturedProducts from "@/Components/HomePage/Sections/FeaturedProducts";
import HeroSection from "@/Components/HomePage/Sections/HeroSection";
import LatestArrivals from "@/Components/HomePage/Sections/LatestArrivals";
import BestSellers from "@/Components/HomePage/Sections/BestSellers";
import TrustBadges from "@/Components/HomePage/Sections/TrustBadges";
import TopCategories from "@/Components/HomePage/Sections/TopCategories";
import Newsletter from "@/Components/HomePage/Sections/Newsletter";

export const metadata: Metadata = {
  title: "FitCheck | Fashion & Clothing Store",
  description: "Shop the latest fashion and clothing styles at FitCheck — men's, women's and kids' clothing, shoes and accessories at great prices.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "FitCheck | Fashion & Clothing Store",
    description: "Shop the latest fashion and clothing styles at FitCheck — men's, women's and kids' clothing, shoes and accessories at great prices.",
    siteName: "FitCheck",
  },
  twitter: {
    card: "summary",
    title: "FitCheck | Fashion & Clothing Store",
    description: "Shop the latest fashion and clothing styles at FitCheck.",
  },
};

export default function Home() {
  return (
    <main>
      <HeroSection />
      <TopCategories />
      <CollectionBanners />
      <LatestArrivals />
      <FeaturedProducts />
      <BestSellers />
      <TrustBadges />
      <Newsletter />
    </main>
  );
}
