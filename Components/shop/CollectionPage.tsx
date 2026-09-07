"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { IoClose, IoFilter, IoChevronDown, IoChevronUp } from "react-icons/io5";
import { useModal } from "@/lib/hooks/useModal";
import ProductCard from "@/Components/shop/ProductCard";
import { ProductGridSkeleton } from "@/Components/ui/Skeleton";
import EmptyState from "@/Components/ui/EmptyState";
import { IoSearchOutline } from "react-icons/io5";

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

interface ApiResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CollectionPageProps {
  title: string;
  description: string;
  filterGender?: string;
  filterCategory?: string;
  filterSubCategory?: string;
  filterSale?: boolean;
  filterLatest?: boolean;
  filterFeatured?: boolean;
  subcategoryNav?: { slug: string; label: string; active: boolean }[];
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "rating", label: "Top Rated" },
];

const PRICE_RANGES = [
  { label: "Under Rs 2,000", min: 0, max: 2000 },
  { label: "Rs 2,000 - Rs 5,000", min: 2000, max: 5000 },
  { label: "Rs 5,000 - Rs 10,000", min: 5000, max: 10000 },
  { label: "Over Rs 10,000", min: 10000, max: undefined },
];

export default function CollectionPage({
  title,
  description,
  filterGender,
  filterCategory,
  filterSubCategory,
  filterSale,
  filterLatest,
  filterFeatured,
  subcategoryNav,
}: CollectionPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min?: number; max?: number } | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(filterSubCategory || null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useModal(mobileFiltersOpen, () => setMobileFiltersOpen(false));
  const [sortOpen, setSortOpen] = useState(false);

  const limit = 24;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterGender) params.set("gender", filterGender);
      if (filterCategory) params.set("category", filterCategory);
      if (selectedSubCategory) params.set("subCategory", selectedSubCategory);
      if (filterLatest) params.set("latest", "true");
      if (filterSale) params.set("sale", "true");
      if (filterFeatured) params.set("featured", "true");
      if (inStockOnly) params.set("inStock", "true");
      if (sort) params.set("sort", sort);
      if (search) params.set("search", search);
      // Multi-value color/size filters are sent to the server (OR semantics).
      if (selectedColors.length > 0) params.set("colors", selectedColors.join(","));
      if (selectedSizes.length > 0) params.set("sizes", selectedSizes.join(","));
      if (selectedPriceRange?.min !== undefined) params.set("minPrice", String(selectedPriceRange.min));
      if (selectedPriceRange?.max !== undefined) params.set("maxPrice", String(selectedPriceRange.max));
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/products?${params.toString()}`);
      const data: ApiResponse = await res.json();

      // All filtering (including sale, multi-color, multi-size) is now done
      // server-side so counts and pagination stay correct.
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filterGender, filterCategory, selectedSubCategory, filterSale, filterLatest, filterFeatured, sort, search, selectedColors, selectedSizes, selectedPriceRange, inStockOnly, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [sort, search, selectedColors, selectedSizes, selectedPriceRange, selectedSubCategory, inStockOnly]);

  const availableColors = useMemo(() => {
    const allColors = new Set<string>();
    products.forEach((p) => p.colors.forEach((c) => allColors.add(c)));
    return Array.from(allColors).sort();
  }, [products]);

  const availableSizes = useMemo(() => {
    const allSizes = new Set<string>();
    products.forEach((p) => p.sizes.forEach((s) => allSizes.add(s)));
    return Array.from(allSizes).sort();
  }, [products]);

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const clearAllFilters = () => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedPriceRange(null);
    setSelectedSubCategory(filterSubCategory || null);
    setInStockOnly(false);
    setSearch("");
    setSort("newest");
  };

  const hasActiveFilters = selectedColors.length > 0 || selectedSizes.length > 0 || selectedPriceRange !== null || inStockOnly || search.length > 0;

  const filterSidebar = (
    <div className="space-y-6">
      {selectedSubCategory && (
        <div>
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Type</p>
          <button
            onClick={() => setSelectedSubCategory(null)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <IoClose size={14} />
            Clear: {selectedSubCategory}
          </button>
        </div>
      )}

      {availableColors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Color</p>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((color) => (
              <button
                key={color}
                onClick={() => toggleColor(color)}
                className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                  selectedColors.includes(color)
                    ? "border-secondary bg-secondary text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {availableSizes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Size</p>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`min-w-[40px] px-3 py-2 text-xs rounded-lg border transition-all ${
                  selectedSizes.includes(size)
                    ? "border-secondary bg-secondary text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Availability</p>
        <button
          role="checkbox"
          aria-checked={inStockOnly}
          onClick={() => setInStockOnly((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2.5 w-full text-xs rounded-lg border transition-all ${
            inStockOnly
              ? "border-secondary bg-secondary text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-400"
          }`}
        >
          <span
            className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
              inStockOnly ? "bg-white text-secondary border-white" : "border-gray-300 text-transparent"
            }`}
          >
            ✓
          </span>
          In Stock Only
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Price</p>
        <div className="space-y-1.5">
          {PRICE_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() =>
                setSelectedPriceRange((prev) =>
                  prev?.min === range.min && prev?.max === range.max ? null : { min: range.min, max: range.max }
                )
              }
              className={`block w-full text-left px-3 py-2.5 text-xs rounded-lg transition-all ${
                selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Editorial Header */}
        <div className="mb-6 sm:mb-8">
          <p className="eyebrow-light mb-3">FitCheck Collection</p>
          <h1 className="editorial-title text-3xl sm:text-4xl md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-500 sm:text-base">{description}</p>
          <div className="rule-premium mt-6" />
        </div>

        {/* Shop by Type — subcategory navigation */}
        {subcategoryNav && subcategoryNav.length > 0 && (
          <nav aria-label="Shop by type" className="flex gap-2 overflow-x-auto pb-2 -mx-3 sm:mx-0 px-3 sm:px-0 mb-4 sm:mb-6 scrollbar-hide">
            {subcategoryNav.map((sub) => (
              <Link
                key={sub.slug}
                href={`/${sub.slug}`}
                className={`whitespace-nowrap px-4 py-2 text-xs sm:text-sm rounded-full border transition-all ${
                  sub.active
                    ? "bg-secondary text-white border-secondary font-semibold"
                    : "border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
                }`}
              >
                {sub.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200/[0.7] rounded-full text-xs sm:text-sm text-secondary bg-white/70 shadow-[var(--shadow-soft)] hover:border-primary/40 transition-all"
            >
              <IoFilter size={14} />
              Filters
              {hasActiveFilters && (
                <span className="w-5 h-5 bg-primary text-white text-[10px] rounded-full flex items-center justify-center">
                  {selectedColors.length + selectedSizes.length + (selectedPriceRange ? 1 : 0)}
                </span>
              )}
            </button>
            <p className="text-xs sm:text-sm text-gray-400">
              <span className="font-semibold text-secondary">{total}</span> products
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200/[0.7] rounded-full text-xs sm:text-sm text-secondary bg-white/70 shadow-[var(--shadow-soft)] hover:border-primary/40 transition-all"
            >
              <span className="hidden sm:inline">{SORT_OPTIONS.find((o) => o.value === sort)?.label || "Sort"}</span>
              <span className="sm:hidden">Sort</span>
              {sortOpen ? <IoChevronUp size={14} /> : <IoChevronDown size={14} />}
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-[var(--shadow-raise)] z-30 py-1.5">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSort(option.value);
                      setSortOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      sort === option.value ? "text-primary font-semibold bg-orange-50" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            <span className="text-[10px] sm:text-xs text-gray-400">Active:</span>
            {selectedColors.map((c) => (
              <button key={c} onClick={() => toggleColor(c)} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] sm:text-xs rounded-full">
                {c} <IoClose size={10} />
              </button>
            ))}
            {selectedSizes.map((s) => (
              <button key={s} onClick={() => toggleSize(s)} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] sm:text-xs rounded-full">
                {s} <IoClose size={10} />
              </button>
            ))}
            {selectedPriceRange && (
              <button onClick={() => setSelectedPriceRange(null)} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] sm:text-xs rounded-full">
                Price range <IoClose size={10} />
              </button>
            )}
            {inStockOnly && (
              <button onClick={() => setInStockOnly(false)} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] sm:text-xs rounded-full">
                In Stock <IoClose size={10} />
              </button>
            )}
            <button onClick={clearAllFilters} className="text-[10px] sm:text-xs text-gray-400 hover:text-red-500 underline ml-1 sm:ml-2">
              Clear all
            </button>
          </div>
        )}

        <div className="flex gap-4 sm:gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            {filterSidebar}
          </div>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <ProductGridSkeleton count={6} />
            ) : products.length === 0 ? (
              <EmptyState
                icon={<IoSearchOutline size={28} />}
                title="No products found"
                description="Try adjusting your filters, searching for something else, or browse our full collection."
                actions={[
                  ...(hasActiveFilters
                    ? [
                        {
                          label: "Clear Filters",
                          variant: "outline" as const,
                          onClick: clearAllFilters,
                        },
                      ]
                    : []),
                  { label: "Browse All Products", href: "/" },
                ]}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-8 sm:mt-10">
                    {page > 1 && (
                      <button
                        onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="px-3 py-2 text-xs font-semibold border border-gray-200 rounded-full bg-white shadow-[var(--shadow-soft)] hover:border-primary/40 transition"
                      >
                        Prev
                      </button>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPages <= 5) return true;
                        if (p === 1 || p === totalPages) return true;
                        if (Math.abs(p - page) <= 1) return true;
                        return false;
                      })
                      .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "ellipsis" ? (
                          <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">...</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => { setPage(p as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                            className={`min-w-[36px] sm:min-w-[44px] h-9 sm:h-11 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                              page === p
                                ? "bg-primary text-white shadow-[0_10px_24px_-10px_rgba(255,107,53,0.6)]"
                                : "border border-gray-200 bg-white text-secondary hover:border-primary hover:text-primary"
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                    {page < totalPages && (
                      <button
                        onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="px-3 py-2 text-xs font-semibold border border-gray-200 rounded-full bg-white shadow-[var(--shadow-soft)] hover:border-primary/40 transition"
                      >
                        Next
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[85vw] max-w-80 bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <h2 className="font-bold text-secondary">Filters</h2>
              <button onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters" className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-full">
                <IoClose size={20} />
              </button>
            </div>
            <div className="p-4">
              {filterSidebar}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full min-h-[44px] py-3 bg-primary text-white text-sm font-semibold rounded-xl"
              >
                Show {total} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
