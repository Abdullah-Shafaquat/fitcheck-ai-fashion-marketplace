"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  images: string[];
  colorImages?: Record<string, string[]>;
  category: string;
  subCategory?: string | null;
  gender: string;
  sizes: string[];
  colors: string[];
  stock: number;
  rating: number;
  reviews: number;
  badge?: string | null;
  sku?: string | null;
}

interface CartItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  oldPrice?: number | null;
  size: string;
  color: string;
  sku?: string | null;
  quantity: number;
  stock: number;
}

interface RecentlyViewedItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  image: string;
  category: string;
  gender: string;
  viewedAt: number;
}

interface StoreContextType {
  cart: CartItem[];
  wishlist: Product[];
  recentlyViewed: RecentlyViewedItem[];
  addToCart: (product: Product, size: string, color: string, quantity?: number) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateCartQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  removePurchasedItems: (items: {
    productId: string;
    size: string;
    color: string;
    quantity?: number;
  }[]) => void;
  refreshCartPrices: (
    updates: Record<string, { price: number; oldPrice?: number | null; stock: number }>
  ) => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  getWishlistCount: () => number;
  addRecentlyViewed: (product: Product) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const MAX_RECENTLY_VIEWED = 20;

function getProductImage(product: Product, color?: string): string {
  if (color && product.colorImages && typeof product.colorImages === 'object') {
    const colorKey = Object.keys(product.colorImages).find(
      (k) => k.toLowerCase() === color.toLowerCase()
    );
    if (colorKey && Array.isArray(product.colorImages[colorKey]) && product.colorImages[colorKey].length > 0) {
      return product.colorImages[colorKey][0];
    }
  }
  return product.images?.[0] || "/images/placeholder.jpg";
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const savedCart = localStorage.getItem("fitcheck-cart");
      const savedWishlist = localStorage.getItem("fitcheck-wishlist");
      const savedRecentlyViewed = localStorage.getItem("fitcheck-recently-viewed");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        setCart(parsed.map((item: any) => {
          if (item.product) {
            return {
              productId: item.product.id,
              name: item.product.name,
              slug: item.product.slug,
              image: item.product.images?.[0] || "/images/placeholder.jpg",
              price: item.product.price,
              oldPrice: item.product.oldPrice,
              size: item.size,
              color: item.color,
              sku: item.product.sku,
              quantity: item.quantity,
              stock: typeof item.product.stock === "number" ? item.product.stock : Number.MAX_SAFE_INTEGER,
            };
          }
          return {
            ...item,
            stock: typeof item.stock === "number" ? item.stock : Number.MAX_SAFE_INTEGER,
          };
        }));
      }
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
      if (savedRecentlyViewed) setRecentlyViewed(JSON.parse(savedRecentlyViewed));
    } catch {}
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("fitcheck-cart", JSON.stringify(cart));
    }
  }, [cart, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("fitcheck-wishlist", JSON.stringify(wishlist));
    }
  }, [wishlist, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("fitcheck-recently-viewed", JSON.stringify(recentlyViewed));
    }
  }, [recentlyViewed, mounted]);

  const addToCart = useCallback((product: Product, size: string, color: string, quantity = 1) => {
    const image = getProductImage(product, color);
    const stock = typeof product.stock === "number" ? product.stock : Number.MAX_SAFE_INTEGER;
    const safeQty = Math.max(1, Math.min(quantity, stock));
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.size === size && item.color === color
      );
      if (existing) {
        const newQty = Math.min(existing.quantity + safeQty, stock);
        return prev.map((item) =>
          item.productId === product.id && item.size === size && item.color === color
            ? { ...item, quantity: Math.max(1, newQty) }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image,
        price: product.price,
        oldPrice: product.oldPrice,
        size,
        color,
        sku: product.sku,
        quantity: Math.max(1, safeQty),
        stock,
      }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, size: string, color: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.productId === productId && item.size === size && item.color === color)
      )
    );
  }, []);

  const updateCartQuantity = useCallback((productId: string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.size === size && item.color === color
          ? {
              ...item,
              quantity: Math.min(quantity, typeof item.stock === "number" ? item.stock : Number.MAX_SAFE_INTEGER),
            }
          : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => setCart([]), []);

  const removePurchasedItems = useCallback(
    (items: { productId: string; size: string; color: string; quantity?: number }[]) => {
      setCart((prev) => {
        let changed = false;
        const next = prev
          .map((item) => {
            const match = items.find(
              (it) =>
                it.productId === item.productId &&
                it.size === item.size &&
                it.color === item.color
            );
            if (!match) return item;
            const purchased = Math.min(Math.round(match.quantity ?? 1), item.quantity);
            if (purchased <= 0) return item;
            changed = true;
            if (purchased >= item.quantity) return null;
            return { ...item, quantity: item.quantity - purchased };
          })
          .filter((x): x is CartItem => x !== null);
        return changed ? next : prev;
      });
    },
    []
  );

  const refreshCartPrices = useCallback(
    (updates: Record<string, { price: number; oldPrice?: number | null; stock: number }>) => {
      setCart((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          const u = updates[item.productId];
          if (!u) return item;
          const newStock = Math.max(0, Math.floor(u.stock) || 0);
          const same =
            u.price === item.price &&
            (u.oldPrice ?? null) === (item.oldPrice ?? null) &&
            newStock === (typeof item.stock === "number" ? item.stock : -1);
          if (same) return item;
          changed = true;
          return {
            ...item,
            price: u.price,
            oldPrice: u.oldPrice ?? null,
            stock: newStock,
            quantity: newStock > 0 ? Math.min(item.quantity, newStock) : item.quantity,
          };
        });
        return changed ? next : prev;
      });
    },
    []
  );

  const getCartTotal = useCallback(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const getCartCount = useCallback(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  const addToWishlist = useCallback((product: Product) => {
    setWishlist((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    setWishlist((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const isInWishlist = useCallback((productId: string) => {
    return wishlist.some((p) => p.id === productId);
  }, [wishlist]);

  const getWishlistCount = useCallback(() => wishlist.length, [wishlist]);

  const addRecentlyViewed = useCallback((product: Product) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((item) => item.id !== product.id);
      const newItem: RecentlyViewedItem = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        oldPrice: product.oldPrice,
        image: product.images?.[0] || "/images/placeholder.jpg",
        category: product.category,
        gender: product.gender,
        viewedAt: Date.now(),
      };
      return [newItem, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
    });
  }, []);

  return (
    <StoreContext.Provider
      value={{
        cart,
        wishlist,
        recentlyViewed,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        removePurchasedItems,
        refreshCartPrices,
        getCartTotal,
        getCartCount,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        getWishlistCount,
        addRecentlyViewed,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within a StoreProvider");
  return context;
}
