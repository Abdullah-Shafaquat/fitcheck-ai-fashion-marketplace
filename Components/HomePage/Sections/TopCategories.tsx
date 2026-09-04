"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect } from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { gsap } from "gsap";

const categories = [
  { name: "Men", href: "/men", image: "/images/categories/men.png", count: "245+ Products" },
  { name: "Women", href: "/women", image: "/images/categories/women.png", count: "312+ Products" },
  { name: "Kids", href: "/kids", image: "/images/categories/kid.png", count: "189+ Products" },
  { name: "T-Shirts", href: "/t-shirts", image: "/images/categories/tshirts.png", count: "156+ Products" },
  { name: "Hoodies", href: "/hoodies-sweatshirts", image: "/images/categories/hoodies.png", count: "87+ Products" },
  { name: "Jeans", href: "/jeans", image: "/images/categories/jeans.png", count: "98+ Products" },
  { name: "Jackets", href: "/jackets-coats", image: "/images/categories/jackets.png", count: "76+ Products" },
  { name: "Shoes", href: "/shoes", image: "/images/categories/shoes.png", count: "203+ Products" },
  { name: "Accessories", href: "/accessories", image: "/images/categories/accessories.png", count: "167+ Products" },
];

export default function TopCategories() {
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Respect prefers-reduced-motion: leave cards visible, skip entrance animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from(".category-card", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const smooth =
      typeof window === "undefined" ||
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    trackRef.current?.scrollBy({ left: dir * 280, behavior: smooth ? "smooth" : "auto" });
  };

  return (
    <section ref={sectionRef} className="w-full py-14 sm:py-20 bg-white overflow-hidden">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-0.5 bg-primary rounded-full" />
              <p className="eyebrow-light animate-fade-in">
                Shop By Category
              </p>
            </div>
            <h2 className="editorial-title text-3xl sm:text-4xl md:text-[2.75rem] animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Browse The Collection
            </h2>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Scroll categories left"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 text-secondary shadow-sm hover:bg-primary hover:text-white hover:border-primary hover:scale-110 transition-all duration-300"
            >
              <IoChevronBack size={18} />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="Scroll categories right"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 text-secondary shadow-sm hover:bg-primary hover:text-white hover:border-primary hover:scale-110 transition-all duration-300"
            >
              <IoChevronForward size={18} />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((cat, index) => (
            <Link
              key={cat.name}
              href={cat.href}
              className="category-card group relative flex-shrink-0 w-[46vw] sm:w-[200px] lg:w-[220px] overflow-hidden rounded-2xl bg-gray-50 aspect-[3/4] snap-start"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {/* Image */}
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                sizes="(max-width: 640px) 46vw, 220px"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-all duration-500" />
              
              {/* Border Glow on Hover */}
              <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/0 group-hover:ring-primary/30 transition-all duration-500" />
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 transform transition-transform duration-500 group-hover:translate-y-[-4px]">
                <h3 className="text-white text-lg font-bold">{cat.name}</h3>
                <p className="text-xs text-white/60">{cat.count}</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-white/80 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  Shop Now
                  <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
              
              {/* Number Badge */}
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold flex items-center justify-center">
                {String(index + 1).padStart(2, '0')}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}