"use client";

import { useStore } from "@/lib/context/StoreContext";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import EmptyState from "@/Components/ui/EmptyState";
import { IoHeartOutline, IoBagOutline, IoTrashOutline, IoArrowBackOutline } from "react-icons/io5";

interface LiveStatus {
  found?: boolean;
  price?: number;
  oldPrice?: number | null;
  stock?: number;
  publiclyAvailable?: boolean;
}

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, addToCart } = useStore();
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [statusMap, setStatusMap] = useState<Record<string, LiveStatus>>({});

  const wishlistKey = wishlist
    .map((p) => p.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (wishlist.length === 0) {
      setStatusMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/store/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: wishlist.map((p) => ({ productId: p.id, size: "", color: "" })),
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        const map: Record<string, LiveStatus> = {};
        (data.results || []).forEach((r: LiveStatus & { productId: string }) => {
          map[r.productId] = r;
        });
        setStatusMap(map);
      } catch {
        // Non-critical: exact stock/price is re-validated when the item moves to cart.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlistKey]);

  const handleAddToCart = (product: typeof wishlist[0]) => {
    const live = statusMap[product.id];
    const outOfStock = (live?.stock ?? product.stock ?? Number.MAX_SAFE_INTEGER) <= 0;
    if (outOfStock) return;
    // When a variant (size or multiple colors) must be chosen, take the user
    // to the product page so they pick the correct variant instead of silently
    // adding the first one. Products without a required variant quick-add.
    const needsVariant =
      (product.sizes?.length ?? 0) > 0 || (product.colors?.length ?? 0) > 1;
    if (needsVariant) {
      window.location.href = `/products/${product.slug}`;
      return;
    }
    const size = product.sizes?.[0] || "M";
    const color = product.colors?.[0] || "Default";
    addToCart(product, size, color);
    removeFromWishlist(product.id);
  };

  if (wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4">
          <EmptyState
            icon={<IoHeartOutline size={28} />}
            title="Your Wishlist is Empty"
            description="Save items you love to your wishlist and come back to them anytime."
            actions={[{ label: "Explore Products", href: "/shop" }]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <h1 className="editorial-title text-3xl md:text-4xl text-secondary">Wishlist</h1>
          <span className="text-sm text-gray-400 mb-1">{wishlist.length} items</span>
        </div>
        <div className="rule-premium mb-8" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {wishlist.map((product) => {
            const live = statusMap[product.id];
            const outOfStock = (live?.stock ?? product.stock ?? Number.MAX_SAFE_INTEGER) <= 0;
            const unavailable =
              live !== undefined && (live.found === false || live.publiclyAvailable === false);
            const price = live?.price ?? product.price;
            const oldPrice = live?.oldPrice ?? product.oldPrice;
            const imgSrc = imgErrors[product.id] || !product.images?.[0]
              ? "/images/placeholder.jpg"
              : product.images[0];
            return (
            <div key={product.id} className="bg-white rounded-2xl overflow-hidden group border border-gray-100 shadow-[var(--shadow-lift)] transition-all duration-500 hover:shadow-[var(--shadow-raise)] hover:-translate-y-1">
              <Link href={`/products/${product.slug}`} className="relative aspect-[3/4] block bg-gray-50 overflow-hidden">
                <div className="absolute inset-0 zoom-media">
                  <Image
                    src={imgSrc}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                    onError={() => setImgErrors((prev) => ({ ...prev, [product.id]: true }))}
                  />
                </div>
                {product.badge && (
                  <span className="absolute top-3 left-3 px-2 py-1 bg-primary text-white text-[10px] font-bold uppercase rounded-full">
                    {product.badge}
                  </span>
                )}
                {(unavailable || outOfStock) && (
                  <span className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                    <span className={`px-3 py-1.5 text-white text-[10px] font-bold uppercase tracking-wider rounded-full ${unavailable ? "bg-red-500" : "bg-secondary"}`}>
                      {unavailable ? "No Longer Available" : "Out of Stock"}
                    </span>
                  </span>
                )}
              </Link>

              <div className="p-4">
                <Link href={`/products/${product.slug}`}>
                  <h3 className="text-sm font-semibold text-secondary truncate hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-xs text-gray-400 mt-1">{product.category}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-bold text-secondary">Rs {price.toLocaleString()}</span>
                  {oldPrice && oldPrice > price && (
                    <span className="text-xs text-gray-400 line-through">Rs {oldPrice.toLocaleString()}</span>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={unavailable || outOfStock}
                    className="flex-1 min-h-[44px] py-2 bg-secondary text-white text-xs font-semibold rounded-lg hover:bg-primary transition-all flex items-center justify-center gap-1.5 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <IoBagOutline size={14} />
                    {unavailable
                      ? "Unavailable"
                      : (product.sizes?.length ?? 0) > 0 || (product.colors?.length ?? 0) > 1 ? "Select Variant" : "Add to Cart"}
                  </button>
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-200 transition-all"
                  >
                    <IoTrashOutline size={14} />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <div className="mt-8">
          <Link href="/shop" className="text-sm text-primary hover:underline flex items-center gap-1">
            <IoArrowBackOutline size={14} />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
