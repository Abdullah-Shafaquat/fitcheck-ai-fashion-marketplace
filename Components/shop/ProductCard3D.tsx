"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { IoHeartOutline, IoHeart, IoBagOutline } from "react-icons/io5";
import { useStore } from "@/lib/context/StoreContext";

export interface Product3D {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  images: string[];
  category?: string | null;
  subCategory?: string | null;
  gender?: string | null;
  sizes?: string[];
  colors?: string[];
  stock?: number;
  rating?: number | null;
  reviews?: number | null;
  badge?: string | null;
}

function ColorDot({ color }: { color: string }) {
  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color);
  const isWord = /^[a-z]+$/i.test(color) && !isHex;
  const bg = isHex ? color : isWord ? `var(--c-${color.toLowerCase()}, #888)` : "#888";
  return (
    <span
      className="h-3 w-3 rounded-full border border-white/30"
      style={{ background: bg }}
      title={color}
    />
  );
}

export default function ProductCard3D({
  product,
  priority = false,
  orientation = "tall",
}: {
  product: Product3D;
  priority?: boolean;
  orientation?: "tall" | "square";
}) {
  const { addToWishlist, removeFromWishlist, isInWishlist, addToCart } = useStore();
  const [addedToCart, setAddedToCart] = useState(false);
  const inWishlist = isInWishlist(product.id);
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product as never, product.sizes?.[0] || "M", product.colors?.[0] || "Default");
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) removeFromWishlist(product.id);
    else addToWishlist(product as never);
  };

  return (
    <div className="group relative">
      <Link href={`/products/${product.slug}`} className="block overflow-hidden rounded-2xl border border-white/10 bg-surface-2" aria-label={product.name}>
        {/* Image */}
        <div className={`relative overflow-hidden bg-surface ${orientation === "tall" ? "aspect-[3/4]" : "aspect-square"}`}>
          <Image
            src={product.images?.[0] || "/images/placeholder.jpg"}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 70vw, (max-width: 1024px) 40vw, 30vw"
            className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.1]"
            priority={priority}
          />

          {product.badge && !discount && (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              {product.badge}
            </span>
          )}
          {discount > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-white">
              -{discount}%
            </span>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          {/* hover reveal: add to cart */}
          <div className="absolute inset-x-3 bottom-3 translate-y-14 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={handleAddToCart}
              className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold backdrop-blur-md ${
                addedToCart ? "bg-green-500 text-white" : "bg-white/95 text-ink hover:bg-primary hover:text-white"
              }`}
            >
              <IoBagOutline size={16} />
              {addedToCart ? "Added!" : "Add to Cart"}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          {product.category && (
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/35">
              {product.category}
            </p>
          )}
          <h3 className="mt-1 truncate text-sm font-semibold text-white transition-colors group-hover:text-primary">
            {product.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-base font-bold text-primary">Rs {product.price.toLocaleString()}</span>
            {product.oldPrice && (
              <span className="text-xs text-white/35 line-through">Rs {product.oldPrice.toLocaleString()}</span>
            )}
          </div>
          {product.colors?.length ? (
            <div className="mt-2.5 flex items-center gap-1.5">
              {product.colors.slice(0, 4).map((c, ci) => (
                <ColorDot key={`${c}-${ci}`} color={c} />
              ))}
            </div>
          ) : null}
        </div>
      </Link>

      {/* Wishlist */}
      <button
        onClick={handleWishlist}
        aria-label="Add to wishlist"
        className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-ink/50 text-white/70 backdrop-blur-sm transition-all duration-300 hover:scale-110 ${
          inWishlist ? "text-primary" : "hover:text-primary"
        }`}
      >
        {inWishlist ? <IoHeart size={18} /> : <IoHeartOutline size={18} />}
      </button>
    </div>
  );
}
