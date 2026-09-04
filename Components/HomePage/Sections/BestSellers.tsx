"use client";

import Link from "next/link";
import { useProducts } from "@/lib/hooks/useProducts";
import ProductCard from "@/Components/shop/ProductCard";
import { useRef, useState, useEffect } from "react";
import { FiChevronLeft, FiChevronRight, FiTrendingUp } from "react-icons/fi";

interface ProductCardProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  images: string[];
  category: string;
  subCategory?: string | null;
  gender: string;
  sizes: string[];
  colors: string[];
  stock: number;
  rating: number;
  reviews: number;
  badge?: string | null;
}

export default function BestSellers() {
  const { products, loading } = useProducts("", 50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const bestSellers: ProductCardProduct[] = products
    .filter((p: any) => p.reviews > 0 || p.rating > 0)
    .sort((a: any, b: any) => (b.rating * b.reviews) - (a.rating * a.reviews))
    .slice(0, 12)
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      oldPrice: p.oldPrice,
      images: p.images,
      category: p.category || "",
      subCategory: p.subCategory,
      gender: p.gender || "",
      sizes: p.sizes || [],
      colors: p.colors || [],
      stock: p.stock ?? 0,
      rating: p.rating ?? 0,
      reviews: p.reviews ?? 0,
      badge: p.badge,
    }));

  const checkScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = sliderRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [bestSellers.length]);

  const scroll = (dir: "left" | "right") => {
    const el = sliderRef.current;
    if (!el) return;
    const amount = dir === "left" ? -el.clientWidth * 0.8 : el.clientWidth * 0.8;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="w-full py-14 sm:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FiTrendingUp size={16} className="text-primary" />
              <p className="eyebrow-light">Trending</p>
            </div>
            <h2 className="editorial-title text-3xl sm:text-4xl md:text-[2.75rem]">Best Sellers</h2>
            <p className="text-sm text-gray-500 mt-2">Most loved by our customers</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FiChevronLeft size={18} />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FiChevronRight size={18} />
              </button>
            </div>
            <Link
              href="/shop"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-all duration-300"
            >
              <span>View All</span>
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[200px] lg:w-[240px] aspect-[3/4] rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : bestSellers.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Best sellers coming soon.</p>
        ) : (
          <div
            ref={sliderRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {bestSellers.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-[200px] lg:w-[240px] snap-start">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
