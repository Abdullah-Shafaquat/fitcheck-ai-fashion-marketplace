"use client";

import { useEffect, useState, useCallback } from "react";

export interface HomeProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  images: string[];
  category?: string | null;
  subCategory?: string | null;
  gender?: string | null;
  colors?: string[];
  sizes?: string[];
  stock?: number;
  rating?: number | null;
  reviews?: number | null;
  badge?: string | null;
}

export function useProducts(
  params: string,
  limit = 8,
  deps: unknown[] = []
): { products: HomeProduct[]; loading: boolean } {
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIt = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      const items = (Array.isArray(data) ? data : data.products || []).slice(0, limit);
      setProducts(items);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, limit, ...deps]);

  useEffect(() => {
    let active = true;
    fetchIt();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchIt]);

  return { products, loading };
}
