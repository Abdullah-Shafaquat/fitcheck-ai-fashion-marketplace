import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

type Props = {
  params: Promise<{ category: string }>;
};

// Mirrors app/[category]/page.tsx so search crawlers get accurate per-category
// titles/descriptions. Real content only — no keyword stuffing.
const CATEGORY_META: Record<string, { title: string; description: string }> = {
  men: { title: "Men's Fashion & Clothing", description: "Shop the latest fashion for men — clothing, shoes and accessories at FitCheck." },
  women: { title: "Women's Fashion & Clothing", description: "Shop the latest fashion for women — dresses, tops, shoes and more at FitCheck." },
  kids: { title: "Kids' Fashion & Clothing", description: "Style for the little ones — kids' clothing and shoes at FitCheck." },
  clothing: { title: "Clothing", description: "Explore our full clothing collection — shirts, jeans, dresses, activewear and more." },
  shoes: { title: "Shoes & Footwear", description: "Step up your shoe game — sneakers, boots, sandals, heels and more." },
  accessories: { title: "Accessories", description: "Complete your look with accessories — bags, belts, watches, sunglasses and more." },
  "new-arrivals": { title: "New Arrivals", description: "Fresh styles just dropped at FitCheck." },
  sale: { title: "Sale & Deals", description: "Great deals on your favorite styles at FitCheck." },
  featured: { title: "Featured Styles", description: "Hand-picked styles curated by FitCheck." },
  "t-shirts": { title: "T-Shirts", description: "Shop T-shirts for men, women and kids at FitCheck." },
  shirts: { title: "Shirts", description: "Shop shirts at FitCheck." },
  jeans: { title: "Jeans", description: "Shop jeans at FitCheck." },
  "hoodies-sweatshirts": { title: "Hoodies & Sweatshirts", description: "Shop hoodies and sweatshirts at FitCheck." },
  jackets: { title: "Jackets", description: "Shop jackets at FitCheck." },
  coats: { title: "Coats", description: "Shop coats at FitCheck." },
  trousers: { title: "Trousers", description: "Shop trousers at FitCheck." },
  "cargo-pants": { title: "Cargo Pants", description: "Shop cargo pants at FitCheck." },
  shorts: { title: "Shorts", description: "Shop shorts at FitCheck." },
  sweaters: { title: "Sweaters", description: "Shop sweaters at FitCheck." },
  tracksuits: { title: "Tracksuits", description: "Shop tracksuits at FitCheck." },
  dresses: { title: "Dresses", description: "Shop dresses at FitCheck." },
  tops: { title: "Tops", description: "Shop tops at FitCheck." },
  blouses: { title: "Blouses", description: "Shop blouses at FitCheck." },
  leggings: { title: "Leggings", description: "Shop leggings at FitCheck." },
  skirts: { title: "Skirts", description: "Shop skirts at FitCheck." },
  cardigans: { title: "Cardigans", description: "Shop cardigans at FitCheck." },
  activewear: { title: "Activewear", description: "Shop activewear and workout clothing at FitCheck." },
  sneakers: { title: "Sneakers", description: "Shop sneakers at FitCheck." },
  "running-shoes": { title: "Running Shoes", description: "Shop running shoes at FitCheck." },
  "casual-shoes": { title: "Casual Shoes", description: "Shop casual shoes at FitCheck." },
  boots: { title: "Boots", description: "Shop boots at FitCheck." },
  loafers: { title: "Loafers", description: "Shop loafers at FitCheck." },
  sandals: { title: "Sandals", description: "Shop sandals at FitCheck." },
  heels: { title: "Heels", description: "Shop heels at FitCheck." },
  flats: { title: "Flats", description: "Shop flats at FitCheck." },
  "kids-shoes": { title: "Kids Shoes", description: "Shop kids' shoes at FitCheck." },
  bags: { title: "Bags", description: "Shop bags at FitCheck." },
  backpacks: { title: "Backpacks", description: "Shop backpacks at FitCheck." },
  belts: { title: "Belts", description: "Shop belts at FitCheck." },
  hats: { title: "Hats", description: "Shop hats at FitCheck." },
  caps: { title: "Caps", description: "Shop caps at FitCheck." },
  sunglasses: { title: "Sunglasses", description: "Shop sunglasses at FitCheck." },
  wallets: { title: "Wallets", description: "Shop wallets at FitCheck." },
  watches: { title: "Watches", description: "Shop watches at FitCheck." },
  "jackets-coats": { title: "Jackets & Coats", description: "Outerwear for every season at FitCheck." },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const meta = CATEGORY_META[category];
  const base = siteUrl();
  const url = `${base}/${category}`;

  if (!meta) {
    // Unknown dynamic route that does not map to a real landing — do not index.
    return {
      title: "Category",
      description: "Browse products at FitCheck.",
      robots: { index: false, follow: true },
    };
  }

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: meta.title, description: meta.description, url, siteName: "FitCheck" },
    twitter: { card: "summary", title: meta.title, description: meta.description },
    robots: { index: true, follow: true },
  };
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
