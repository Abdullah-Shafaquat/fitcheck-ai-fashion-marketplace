"use client";

import { use } from "react";
import CollectionPage from "@/Components/shop/CollectionPage";

// Real subcategory taxonomy derived from the live catalog. Each slug maps to the
// exact subCategory value stored in the database, so routes never point at
// empty/mis-named categories. "Shop by type" navigation is built from this list.
const SUBS = {
  "t-shirts": { label: "T-Shirts" },
  shirts: { label: "Shirts" },
  jeans: { label: "Jeans" },
  "hoodies-sweatshirts": { label: "Hoodies & Sweatshirts" },
  jackets: { label: "Jackets" },
  coats: { label: "Coats" },
  trousers: { label: "Trousers" },
  "cargo-pants": { label: "Cargo Pants" },
  shorts: { label: "Shorts" },
  sweaters: { label: "Sweaters" },
  tracksuits: { label: "Tracksuits" },
  dresses: { label: "Dresses" },
  tops: { label: "Tops" },
  blouses: { label: "Blouses" },
  leggings: { label: "Leggings" },
  skirts: { label: "Skirts" },
  cardigans: { label: "Cardigans" },
  activewear: { label: "Activewear" }, // subcategory (was wrongly a top-level category)
  sneakers: { label: "Sneakers" },
  "running-shoes": { label: "Running Shoes" },
  "casual-shoes": { label: "Casual Shoes" },
  boots: { label: "Boots" },
  loafers: { label: "Loafers" },
  sandals: { label: "Sandals" },
  heels: { label: "Heels" },
  flats: { label: "Flats" },
  "kids-shoes": { label: "Kids Shoes" },
  bags: { label: "Bags" }, // subcategory (was wrongly a top-level category)
  backpacks: { label: "Backpacks" },
  belts: { label: "Belts" },
  hats: { label: "Hats" },
  caps: { label: "Caps" },
  sunglasses: { label: "Sunglasses" },
  wallets: { label: "Wallets" },
  watches: { label: "Watches" }, // subcategory (was wrongly a top-level category)
} as const;

// A stable, human-friendly display order for the "Shop by type" rail.
const NAV_ORDER = [
  "t-shirts", "shirts", "jeans", "hoodies-sweatshirts", "jackets", "coats",
  "trousers", "cargo-pants", "shorts", "sweaters", "tracksuits", "dresses",
  "tops", "blouses", "leggings", "skirts", "cardigans", "activewear",
  "sneakers", "running-shoes", "casual-shoes", "boots", "loafers", "sandals",
  "heels", "flats", "kids-shoes", "bags", "backpacks", "belts", "hats",
  "caps", "sunglasses", "wallets", "watches",
];

function allNav(activeSlug?: string) {
  return NAV_ORDER.map((slug) => ({
    slug,
    label: SUBS[slug as keyof typeof SUBS].label,
    active: slug === activeSlug,
  }));
}

const categoryMap: Record<
  string,
  {
    title: string;
    description: string;
    filterCategory?: string;
    filterGender?: string;
    filterSubCategory?: string;
    filterSale?: boolean;
    filterLatest?: boolean;
    filterFeatured?: boolean;
  }
> = {
  men: { title: "Men", description: "Shop the latest fashion for men", filterGender: "Men" },
  women: { title: "Women", description: "Shop the latest fashion for women", filterGender: "Women" },
  kids: { title: "Kids", description: "Style for the little ones", filterGender: "Kids" },
  clothing: { title: "Clothing", description: "Explore our full clothing collection", filterCategory: "Clothing" },
  shoes: { title: "Shoes", description: "Step up your shoe game", filterCategory: "Shoes" },
  accessories: { title: "Accessories", description: "Complete your look with accessories", filterCategory: "Accessories" },
  "new-arrivals": { title: "New Arrivals", description: "Fresh styles just dropped", filterLatest: true },
  sale: { title: "Sale", description: "Great deals on your favorite styles", filterSale: true },
  featured: { title: "Featured", description: "Hand-picked styles", filterFeatured: true },
  // ---- Real subcategory routes ----
  ...Object.fromEntries(
    Object.entries(SUBS).map(([slug, { label }]) => [
      slug,
      { title: label, description: `Shop ${label}`, filterSubCategory: label },
    ])
  ),
  // "jackets-coats" kept for backward-compat of the old URL; points at real "Jackets".
  "jackets-coats": { title: "Jackets & Coats", description: "Outerwear for every season", filterSubCategory: "Jackets" },
};

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const config = categoryMap[category] || {
    title: category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Browse ${category.replace(/-/g, " ")} products`,
  };

  // Show the "Shop by type" rail on gender landings and subcategory pages.
  const isSubcategory = SUBS[category as keyof typeof SUBS] !== undefined;
  const activeSub = isSubcategory ? category : undefined;

  return (
    <CollectionPage
      title={config.title}
      description={config.description}
      filterCategory={config.filterCategory}
      filterGender={config.filterGender}
      filterSubCategory={config.filterSubCategory}
      filterSale={config.filterSale}
      filterLatest={config.filterLatest}
      filterFeatured={config.filterFeatured}
      subcategoryNav={allNav(activeSub)}
    />
  );
}
