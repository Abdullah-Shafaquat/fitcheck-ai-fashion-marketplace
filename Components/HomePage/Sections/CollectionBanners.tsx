"use client";

import Link from "next/link";
import Image from "next/image";

const banners = [
  {
    title: "New Season",
    subtitle: "Fresh looks for the latest drop",
    link: "/new-arrivals",
    label: "Explore",
    image: "/images/banners/new-season.png",
    badge: "Trending",
  },
  {
    title: "Streetwear",
    subtitle: "Style that speaks louder",
    link: "/men",
    label: "Shop Men",
    image: "/images/banners/streetwear.png",
    badge: "Limited",
  },
  {
    title: "Mens Style",
    subtitle: "Essentials, elevated",
    link: "/clothing",
    label: "Shop Now",
    image: "/images/banners/mens-style.png",
    badge: "Best Seller",
  },
];

export default function CollectionBanners() {
  return (
    <section className="w-full py-14 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="eyebrow-light mb-3">
            Shop By Collection
          </p>
          <h2 className="editorial-title text-3xl sm:text-4xl md:text-[2.75rem]">
            Curated Collections
          </h2>
        </div>

        {/* Banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {banners.map((banner) => (
            <Link
              key={banner.title}
              href={banner.link}
              className="group relative overflow-hidden rounded-2xl aspect-[16/10] sm:aspect-[4/3] transition-all duration-500 hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {/* Image */}
              <Image
                src={banner.image}
                alt={banner.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

              {/* Badge */}
              <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full shadow-lg">
                {banner.badge}
              </span>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-white text-lg sm:text-xl font-bold">{banner.title}</h3>
                <p className="text-sm text-white/80">{banner.subtitle}</p>
                {/* CTA now actually animates on hover (previously "opacity-100" with no
                    starting opacity-0 state, so hover had no visible effect) */}
                <span className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-white border-b-2 border-primary pb-1 opacity-90 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  {banner.label} →
                </span>
              </div>

              {/* Hover Shine Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-[-30deg] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}