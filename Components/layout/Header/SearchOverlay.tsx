"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { IoSearchOutline, IoCloseOutline } from "react-icons/io5";
import { usePathname } from "next/navigation";

interface ProductHit {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  images: string[];
  category?: string | null;
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SearchOverlay = ({ open, onClose }: SearchOverlayProps) => {
  const reduce = useReducedMotion();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ProductHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const POPULAR_LINKS = [
    { label: "New Arrivals", href: "/new-arrivals" },
    { label: "Men", href: "/men" },
    { label: "Women", href: "/women" },
    { label: "Shoes", href: "/shoes" },
    { label: "Sale", href: "/sale" },
  ];

  useEffect(() => {
    if (open) {
      setTerm("");
      setResults([]);
      setSearched(false);
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q.trim())}&limit=8`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.products ?? [];
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(term), 280);
    return () => clearTimeout(t);
  }, [term, runSearch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
          aria-modal="true"
          role="dialog"
          aria-label="Search products"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="relative mx-auto w-full max-w-3xl px-4 pt-[12vh]"
            initial={{ y: reduce ? 0 : -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduce ? 0 : -20, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                <IoSearchOutline className="text-primary" size={22} />
                <input
                  ref={inputRef}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-transparent text-lg text-secondary placeholder:text-gray-400 outline-none"
                />
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close search"
                >
                  <IoCloseOutline size={22} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {loading && (
                  <p className="px-4 py-6 text-center text-sm text-gray-500">Searching…</p>
                )}
                {!loading && searched && results.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-gray-500">
                      No products found for “{term}”.
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Try a different keyword or browse these:
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      {POPULAR_LINKS.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={onClose}
                          className="rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-secondary transition-colors hover:border-primary hover:text-primary"
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {!loading && results.length > 0 && (
                  <ul className="divide-y divide-gray-100">
                    {results.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/products/${p.slug}`}
                          onClick={onClose}
                          className="flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-gray-50"
                        >
                          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {p.images?.[0] ? (
                              <Image
                                src={p.images[0]}
                                alt={p.name}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-secondary">{p.name}</p>
                            {p.category && (
                              <p className="text-xs text-gray-500">{p.category}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-primary">
                              Rs {Number(p.price).toLocaleString()}
                            </p>
                            {p.oldPrice && Number(p.oldPrice) > Number(p.price) && (
                              <p className="text-xs text-gray-400 line-through">
                                Rs {Number(p.oldPrice).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {!searched && (
                  <p className="px-4 py-8 text-center text-sm text-gray-400">
                    Type to search the collection.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchOverlay;
