"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef } from "react";
import { IoHeartOutline, IoHeart, IoBagOutline } from "react-icons/io5";
import { useStore } from "@/lib/context/StoreContext";
import { useReducedMotion } from "motion/react";

interface Product {
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

// Maps a color name to a representative hex for swatch display only.
// Unrecognized colors fall back to a neutral tone. This is a visual hint;
// the authoritative color data is always the product's color names.
function colorSwatch(color: string): string {
  const c = color.trim().toLowerCase();
  const map: Record<string, string> = {
    black: "#111111", white: "#ffffff", gray: "#9ca3af", grey: "#9ca3af",
    red: "#ef4444", maroon: "#7f1d1d", burgundy: "#800020", crimson: "#dc2626",
    blue: "#2563eb", navy: "#1e3a8a", sky: "#38bdf8", royalblue: "#4169e1",
    green: "#16a34a", olive: "#808000", emerald: "#059669", teal: "#0d9488",
    yellow: "#facc15", gold: "#d4af37", orange: "#f97316", brown: "#8b5a2b",
    khaki: "#c3b091", beige: "#f5f5dc", purple: "#9333ea", violet: "#8b5cf6",
    pink: "#ec4899", rose: "#f43f5e",     silver: "#c0c0c0", cream: "#fdf6e3",
    denim: "#3b5a8c", charcoal: "#374151", tan: "#d2b48c",
  };
  return map[c] || "#d1d5db";
}

export default function ProductCard({ product }: { product: Product }) {
  const { addToWishlist, removeFromWishlist, isInWishlist, addToCart } = useStore();
  const [isHovered, setIsHovered] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [imgError, setImgError] = useState(false);
  const reduce = useReducedMotion();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const inWishlist = isInWishlist(product.id);
  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 10;
  const imageSrc = imgError || !product.images?.[0] ? "/images/placeholder.jpg" : product.images[0];
  const shownColors = product.colors?.slice(0, 4) || [];

  const handleTiltMove = (e: React.MouseEvent) => {
    const el = frameRef.current;
    if (!el || reduce || outOfStock) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ y: (px - 0.5) * 8, x: (0.5 - py) * 8 });
  };

  const handleTiltLeave = () => setTilt({ x: 0, y: 0 });

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    const size = product.sizes?.[0] || "M";
    const color = product.colors?.[0] || "Default";
    addToCart(product, size, color);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); handleTiltLeave(); }}
    >
      <div className="perspective">
        <div
          ref={frameRef}
          onMouseMove={handleTiltMove}
          onMouseLeave={handleTiltLeave}
          className="relative overflow-hidden rounded-[1.25rem] bg-gray-50 aspect-[3/4] transition-shadow duration-500 group-hover:shadow-[var(--shadow-raise)]"
          style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: "preserve-3d", transition: reduce ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)", willChange: "transform" }}
        >
          <div className="absolute inset-0 zoom-media">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              onError={() => setImgError(true)}
            />
          </div>

          {/* soft gradient for depth on hover */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />

          {product.badge && (
            <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-md">
              {product.badge}
            </span>
          )}

        {discount > 0 && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full">
            -{discount}%
          </span>
        )}

        {outOfStock && (
          <span className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
            <span className="px-3 py-1.5 bg-secondary text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
              Out of Stock
            </span>
          </span>
        )}

        <button
          onClick={handleWishlist}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 ${
            product.badge ? "top-14" : "top-3"
          } ${inWishlist ? "bg-red-50 text-red-500" : "bg-white/80 text-gray-600 hover:bg-white hover:text-red-500"} ${
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
        >
          {inWishlist ? <IoHeart size={18} /> : <IoHeartOutline size={18} />}
        </button>

        <div
          className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 ${
            isHovered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {!outOfStock && (
            <button
              onClick={handleAddToCart}
              className={`w-full min-h-[44px] py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                addedToCart
                  ? "bg-green-500 text-white"
                  : "bg-white/90 backdrop-blur-sm text-secondary hover:bg-primary hover:text-white"
              }`}
            >
              <IoBagOutline size={16} />
              {addedToCart ? "Added!" : "Add to Cart"}
            </button>
          )}
        </div>
          </div>
        </div>

      <div className="mt-3 px-1">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          {product.gender} &middot; {product.category}
        </p>
        <h3 className="text-sm font-semibold text-secondary mt-1 truncate group-hover:text-primary transition-colors duration-300">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm font-bold text-secondary">Rs {product.price.toLocaleString()}</span>
          {product.oldPrice && product.oldPrice > product.price && (
            <span className="text-xs text-gray-400 line-through">Rs {product.oldPrice.toLocaleString()}</span>
          )}
        </div>
        {shownColors.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {shownColors.map((c) => (
              <span
                key={c}
                title={c}
                aria-label={c}
                className="w-3 h-3 rounded-full border border-gray-200"
                style={{ backgroundColor: colorSwatch(c) }}
              />
            ))}
            {product.colors.length > shownColors.length && (
              <span className="text-[9px] text-gray-400">+{product.colors.length - shownColors.length}</span>
            )}
          </div>
        )}
        {lowStock && !outOfStock && (
          <p className="text-[10px] text-orange-500 font-medium mt-1">Only {product.stock} left</p>
        )}
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-3 h-3 ${star <= Math.round(product.rating) ? "text-yellow-400" : "text-gray-200"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-[10px] text-gray-400">({product.reviews})</span>
          </div>
        )}
      </div>
    </Link>
  );
}
