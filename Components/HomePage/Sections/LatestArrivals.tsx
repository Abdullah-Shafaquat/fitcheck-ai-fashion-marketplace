"use client";

import Link from "next/link";
import { useProducts } from "@/lib/hooks/useProducts";
import ProductCard from "@/Components/shop/ProductCard";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

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

export default function LatestArrivals() {
  const { products, loading } = useProducts("latest=true", 12);
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Respect prefers-reduced-motion: leave cards visible, skip entrance animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from(".latest-card", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        y: 50,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [products]);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [products]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>(":scope > div")?.offsetWidth || 260;
    const smooth =
      typeof window === "undefined" ||
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir === "left" ? -(cardWidth + 16) : cardWidth + 16, behavior: smooth ? "smooth" : "auto" });
  };

  const sortedCards: ProductCardProduct[] = products
    .filter((p: any) => p.latestArrival === true)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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

  return (
    <section ref={sectionRef} className="w-full py-14 sm:py-20 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-0.5 bg-primary rounded-full" />
              <p className="eyebrow-light">Just In</p>
            </div>
            <h2 className="editorial-title text-3xl sm:text-4xl md:text-[2.75rem]">New Arrivals</h2>
            <p className="text-sm text-gray-500 mt-2">{sortedCards.length} new products added</p>
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
              href="/new-arrivals"
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
              <div key={i} className="flex-shrink-0 w-[200px] lg:w-[240px] aspect-[3/4] rounded-2xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : sortedCards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">No new arrivals right now — check back soon.</p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {sortedCards.map((p) => (
              <div key={p.id} className="latest-card flex-shrink-0 w-[200px] lg:w-[240px] snap-start">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
