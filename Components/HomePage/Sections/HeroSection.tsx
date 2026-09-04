"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { gsap } from "gsap";

const slides = [
  {
    image: "/images/hero/hero-01.png",
    tag: "New Season · New Drop",
    title: "Elevate Your Everyday Style",
    highlight: "Everyday Style",
    text: "Discover the latest in fashion essentials — crafted for comfort, built for confidence.",
    link: "/shop",
    linkLabel: "Shop Now",
  },
  {
    image: "/images/hero/hero-02.png",
    tag: "Streetwear · Limited",
    title: "Wear The Look That Speaks",
    highlight: "Speaks",
    text: "Bold streetwear pieces for those who dare to stand out this season.",
    link: "/men",
    linkLabel: "Shop Men",
  },
  {
    image: "/images/hero/hero-3.webp",
    tag: "New Collection",
    title: "Fresh Fits For The New You",
    highlight: "New You",
    text: "From clean basics to statement layers — build your wardrobe your way.",
    link: "/new-arrivals",
    linkLabel: "New Arrivals",
  },
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback((i: number) => {
    setCurrent((i + slides.length) % slides.length);
  }, []);

  const next = useCallback(() => go(current + 1), [current, go]);
  const prev = useCallback(() => go(current - 1), [current, go]);

  useEffect(() => {
    if (paused) return;
    // Respect prefers-reduced-motion: do not auto-cycle the carousel (WCAG 2.2.2).
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [paused]);

  // GSAP animation for slide change
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect prefers-reduced-motion: leave content visible, skip entrance animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      // Animate text elements
      gsap.fromTo(
        ".hero-text",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: "power3.out" }
      );

      // Animate image
      gsap.fromTo(
        ".hero-image",
        { scale: 1.1, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: "power3.out" }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [current]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) {
      diff > 0 ? prev() : next();
    }
    touchStartX.current = null;
  };

  const slide = slides[current];
  const highlightIndex = slide.title.indexOf(slide.highlight);
  const beforeHighlight = highlightIndex >= 0 ? slide.title.slice(0, highlightIndex) : slide.title;
  const afterHighlight =
    highlightIndex >= 0 ? slide.title.slice(highlightIndex + slide.highlight.length) : "";

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-[var(--color-canvas)] text-secondary"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
    >
      {/* Editorial grain + accent halos */}
      <div className="grain absolute inset-0 opacity-[0.06]" aria-hidden="true" />
      <div className="accent-halo -top-32 -left-24 h-[420px] w-[420px] bg-primary/20" aria-hidden="true" />
      <div className="accent-halo -bottom-40 right-[-10%] h-[520px] w-[520px] bg-orange-300/25" aria-hidden="true" />

      {/* Slide container */}
      <div className="container relative z-10 mx-auto grid min-h-[82vh] grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:min-h-[88vh] lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
        {/* Text */}
        <div className="relative order-2 text-center lg:order-1 lg:text-left">
          <p key={current + "-tag"} className="hero-text eyebrow-light mb-5">
            {slide.tag}
          </p>
          <h1
            key={current + "-title"}
            className="hero-text editorial-title text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.6rem] xl:text-[5.2rem]"
          >
            {beforeHighlight}
            <span className="relative inline-block text-primary">
              {slide.highlight}
              <span className="absolute -bottom-1.5 left-0 h-[3px] w-full rounded-full bg-primary/30" aria-hidden="true" />
            </span>
            {afterHighlight}
          </h1>
          <p key={current + "-text"} className="hero-text mt-6 max-w-md text-[15px] leading-relaxed text-gray-500 sm:text-base lg:mx-0">
            {slide.text}
          </p>
          <div key={current + "-cta"} className="hero-text mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link href={slide.link} className="btn-premium btn-premium-primary">
              {slide.linkLabel}
              <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link href="/shop" className="btn-ghost-premium">
              Shop All
            </Link>
          </div>

          <div className="hero-text mt-10 hidden items-center gap-8 text-left lg:flex">
            <div>
              <p className="editorial-title text-2xl">304</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Style pieces</p>
            </div>
            <div className="h-10 w-px bg-gray-200" aria-hidden="true" />
            <div>
              <p className="editorial-title text-2xl">40K+</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Happy customers</p>
            </div>
            <div className="h-10 w-px bg-gray-200" aria-hidden="true" />
            <div>
              <p className="editorial-title text-2xl">24/7</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Fast delivery</p>
            </div>
          </div>
        </div>

        {/* Editorial image with depth + tilt */}
        <div className="perspective relative order-1 lg:order-2">
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <div className="group relative aspect-[4/5] overflow-hidden rounded-[1.75rem] img-frame">
              <Image
                key={current + "-img"}
                src={slide.image}
                alt={slide.tag}
                fill
                priority={current === 0}
                sizes="(max-width: 1024px) 85vw, 45vw"
                className="hero-image zoom-media object-cover"
              />
              {/* Soft vignette for cinematic feel */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-70" aria-hidden="true" />
              {/* Animated border */}
              <div className="absolute inset-0 rounded-[1.75rem] border-2 border-primary/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </div>

            {/* Floating editorial card */}
            <div className="absolute -bottom-6 -left-4 hidden animate-float rounded-2xl bg-white/90 px-5 py-4 shadow-2xl backdrop-blur-md sm:block">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Fresh Drop</p>
              <p className="mt-1 text-lg font-extrabold tracking-tight text-secondary">New Season 2026</p>
            </div>

            {/* Secondary depth layer */}
            <div className="pointer-events-none absolute -right-6 -top-6 -z-10 h-40 w-40 rounded-full bg-primary/15 blur-2xl" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Controls — now visible from sm up, plus swipe support on mobile */}
      <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-2 z-20">
        <button
          onClick={prev}
          aria-label="Previous slide"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 text-secondary shadow-lg hover:bg-primary hover:text-white hover:border-primary hover:scale-110 transition-all duration-300"
        >
          <IoChevronBack size={18} />
        </button>
        <button
          onClick={next}
          aria-label="Next slide"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 text-secondary shadow-lg hover:bg-primary hover:text-white hover:border-primary hover:scale-110 transition-all duration-300"
        >
          <IoChevronForward size={18} />
        </button>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === current}
            className={`h-2.5 rounded-full transition-all duration-500 ${
              i === current ? "w-8 bg-primary" : "w-2.5 bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-float { animation: none; }
        }
      `}</style>
    </section>
  );
}