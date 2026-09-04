"use client";

import Link from "next/link";
import { useProducts } from "@/lib/hooks/useProducts";
import ProductCard from "@/Components/shop/ProductCard";
import { useRef, useState, useEffect } from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

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

export default function FeaturedProducts() {
  const { products, loading } = useProducts("featured=true", 12);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activePage, setActivePage] = useState(0);

  // Filter first, then map — avoids an O(n^2) lookup per card
  const featuredProducts: ProductCardProduct[] = products
    .filter((p: any) => p.featured === true)
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

  const pageCount = Math.max(1, Math.ceil(featuredProducts.length / 4));

  const checkScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    const maxScroll = Math.max(1, scrollWidth - clientWidth);
    const page = Math.round((scrollLeft / maxScroll) * (pageCount - 1));
    setActivePage(Number.isFinite(page) ? page : 0);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredProducts.length]);

  const scroll = (direction: "left" | "right") => {
    const el = sliderRef.current;
    if (!el) return;
    const amount = direction === "left" ? -el.clientWidth * 0.8 : el.clientWidth * 0.8;
    el.scrollBy({ left: amount, behavior: "smooth" });
    setTimeout(checkScroll, 350);
  };

  const goToPage = (i: number) => {
    const el = sliderRef.current;
    if (!el) return;
    const target = (i / Math.max(1, pageCount - 1)) * (el.scrollWidth - el.clientWidth);
    el.scrollTo({ left: target, behavior: "smooth" });
  };

  return (
    <section className="w-full py-14 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-0.5 bg-primary rounded-full" />
              <p className="eyebrow-light">Handpicked For You</p>
            </div>
            <h2 className="editorial-title text-3xl sm:text-4xl md:text-[2.75rem]">Featured Products</h2>
            <p className="text-sm text-gray-500 mt-2">
              {featuredProducts.length} featured products
            </p>
          </div>
          <Link href="/featured" className="text-sm font-semibold text-primary hover:underline">
            View All →
          </Link>
        </div>

        {/* Slider */}
        {loading ? (
          // Matches the loaded layout (horizontal scroller) instead of a grid,
          // so there's no visual jump once products arrive.
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[160px] sm:w-[200px] lg:w-[220px] aspect-[3/4] rounded-2xl bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Featured products coming soon.</p>
        ) : (
          <div className="relative">
            {/* Slider Container */}
            <div
              ref={sliderRef}
              className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scroll-px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={checkScroll}
            >
              {featuredProducts.map((p) => (
                <div key={p.id} className="flex-shrink-0 w-[160px] sm:w-[200px] lg:w-[220px] snap-start">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>

            {/* Navigation Arrows — desktop/tablet only, kept inside the container's padding so they never cause page overflow on mobile */}
            {featuredProducts.length > 4 && (
              <div className="hidden sm:block">
                {canScrollLeft && (
                  <button
                    onClick={() => scroll("left")}
                    aria-label="Scroll left"
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 text-secondary hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 z-10"
                  >
                    <IoChevronBack size={20} />
                  </button>
                )}
                {canScrollRight && (
                  <button
                    onClick={() => scroll("right")}
                    aria-label="Scroll right"
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 text-secondary hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 z-10"
                  >
                    <IoChevronForward size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Scroll Indicator Dots — now tracks real scroll position and jumps to the right offset */}
            {pageCount > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to page ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activePage ? "w-6 bg-primary" : "w-1.5 bg-gray-300"
                    }`}
                    onClick={() => goToPage(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}