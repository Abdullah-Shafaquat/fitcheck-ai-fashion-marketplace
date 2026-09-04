"use client";

import { useState, useEffect, use, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FiMapPin,
  FiPhone,
  FiMail,
  FiHeadphones,
  FiInstagram,
  FiFacebook,
  FiSearch,
} from "react-icons/fi";
import Breadcrumbs from "@/Components/shop/Breadcrumbs";

interface Seller {
  id: string;
  storeName: string;
  storeSlug: string;
  logo?: string | null;
  banner?: string | null;
  description?: string | null;
  ownerName?: string | null;
  businessType?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  supportContact?: string | null;
  socialLinks?: Record<string, string>;
  approvedAt?: string | null;
  productCount: number;
}

interface StoreProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  category: string;
  gender: string;
  images: string[];
  colorImages?: Record<string, string[]>;
  stock: number;
  description?: string | null;
}

interface StoreData {
  seller: Seller;
  products: StoreProduct[];
  categories: string[];
}

function getProductImage(product: StoreProduct, color?: string): string {
  if (color && product.colorImages && typeof product.colorImages === "object") {
    const key = Object.keys(product.colorImages).find(
      (k) => k.toLowerCase() === color.toLowerCase()
    );
    if (key) {
      const val: unknown = product.colorImages[key];
      const list = Array.isArray(val)
        ? (val as string[])
        : typeof val === "string" && val.trim()
          ? [val]
          : [];
      if (list.length > 0) return list[0];
    }
  }
  return product.images?.[0] || "/images/placeholder.jpg";
}

export default function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<StoreData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchStore = useCallback(
    async (category: string, q: string) => {
      setLoading(true);
      setNotFound(false);
      try {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (q) params.set("q", q);
        const res = await fetch(`/api/store/${slug}?${params.toString()}`);
        if (res.status === 404) {
          setData(null);
          setNotFound(true);
          return;
        }
        if (res.ok) {
          const json = await res.json();
          setData(json.seller ? json : null);
          if (!json.seller) setNotFound(true);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    fetchStore("", "");
  }, [fetchStore]);

  const applyFilters = (category: string, q: string) => {
    setSelectedCategory(category);
    setSearchInput(q);
    fetchStore(category, q);
  };

  const availableProducts = data?.products || [];

  const socialLinks = data?.seller?.socialLinks || {};
  const banner = data?.seller?.banner;
  const logo = data?.seller?.logo;

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 animate-pulse space-y-6">
          <div className="bg-gray-200 rounded-2xl h-56" />
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-200 rounded-2xl" />
            <div className="space-y-2">
              <div className="bg-gray-200 h-6 rounded w-56" />
              <div className="bg-gray-200 h-4 rounded w-40" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-2xl aspect-[3/4]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || (!loading && !data)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4 py-24">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FiSearch size={28} className="text-gray-300" />
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Store not found</h1>
          <p className="text-sm text-gray-400 mb-8">
            We couldn&apos;t find a store at that address. It may have been removed or is not yet approved.
          </p>
          <Link
            href="/shop"
            className="inline-block px-6 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const seller = data.seller;

  const breadcrumbItems = [
    { label: "Shop", href: "/" },
    { label: seller.storeName },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="mt-4">
          <div className="relative overflow-hidden rounded-2xl h-48 md:h-64">
            {banner ? (
              <Image src={banner} alt={seller.storeName} fill sizes="100vw" className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-[#FF6B35] to-[#ff8f66]" />
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-10 md:-mt-12 px-4 md:px-8 relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 border-white bg-white shadow-md flex-shrink-0">
              {logo ? (
                <Image src={logo} alt={seller.storeName} width={96} height={96} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white">
                  <Image src="/logos/top-logo.png" alt={seller.storeName} width={96} height={96} className="object-contain w-full h-full" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-secondary leading-tight">
                  {seller.storeName}
                </h1>
                {seller.businessType && (
                  <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide rounded-full">
                    {seller.businessType}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {seller.productCount} product{seller.productCount === 1 ? "" : "s"} &middot;{seller.city && ` ${seller.city},`} {seller.country || "Pakistan"}
              </p>
              {seller.ownerName && (
                <p className="text-xs text-gray-400 mt-0.5">Owned by {seller.ownerName}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-bold text-secondary mb-2">About the Store</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {seller.description || "This seller hasn&apos;t added a description yet."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                {seller.address && (
                  <div className="flex items-start gap-2.5">
                    <FiMapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">
                      {[seller.address, seller.city, seller.province].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {seller.phone && (
                  <div className="flex items-center gap-2.5">
                    <FiPhone size={16} className="text-primary flex-shrink-0" />
                    <a href={`tel:${seller.phone}`} className="text-sm text-gray-600 hover:text-primary transition-colors">
                      {seller.phone}
                    </a>
                  </div>
                )}
                {seller.email && (
                  <div className="flex items-center gap-2.5">
                    <FiMail size={16} className="text-primary flex-shrink-0" />
                    <a href={`mailto:${seller.email}`} className="text-sm text-gray-600 hover:text-primary transition-colors">
                      {seller.email}
                    </a>
                  </div>
                )}
                {seller.supportContact && (
                  <div className="flex items-center gap-2.5">
                    <FiHeadphones size={16} className="text-primary flex-shrink-0" />
                    <span className="text-sm text-gray-600">{seller.supportContact}</span>
                  </div>
                )}
              </div>

              {Object.keys(socialLinks).length > 0 && (
                <div className="flex items-center gap-3 mt-5 pt-5 border-t border-gray-100">
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:bg-primary hover:text-white transition-all"
                      aria-label="Instagram"
                    >
                      <FiInstagram size={18} />
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a
                      href={socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:bg-primary hover:text-white transition-all"
                      aria-label="Facebook"
                    >
                      <FiFacebook size={18} />
                    </a>
                  )}
                  {socialLinks.tiktok && (
                    <a
                      href={socialLinks.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-500 hover:text-primary transition-colors"
                      aria-label="TikTok"
                    >
                      TikTok
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-5">
                <h2 className="text-lg font-bold text-secondary">Products</h2>
                <div className="relative flex-1 max-w-xs">
                  <FiSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applyFilters(selectedCategory, searchInput);
                    }}
                    placeholder="Search this store..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  />
                  <button
                    onClick={() => applyFilters(selectedCategory, searchInput)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-all"
                  >
                    Go
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => applyFilters("", searchInput)}
                  className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all ${
                    selectedCategory === ""
                      ? "bg-secondary text-white border-secondary"
                      : "bg-white text-gray-600 border-gray-200 hover:border-secondary"
                  }`}
                >
                  All
                </button>
                {data.categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => applyFilters(cat, searchInput)}
                    className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all ${
                      selectedCategory === cat
                        ? "bg-secondary text-white border-secondary"
                        : "bg-white text-gray-600 border-gray-200 hover:border-secondary"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 rounded-2xl aspect-[3/4]" />
                      <div className="mt-3 space-y-2">
                        <div className="bg-gray-200 h-3 rounded w-1/3" />
                        <div className="bg-gray-200 h-4 rounded w-2/3" />
                        <div className="bg-gray-200 h-3 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-400 text-lg">No products found</p>
                  <p className="text-gray-300 text-sm mt-2">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {availableProducts.map((product) => {
                    const discount = product.oldPrice
                      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
                      : 0;
                    const image = getProductImage(product);
                    return (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        className="group block"
                      >
                        <div className="relative overflow-hidden rounded-2xl bg-gray-50 aspect-[3/4]">
                          <Image
                            src={image}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          {discount > 0 && (
                            <span className="absolute top-3 right-3 px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full">
                              -{discount}%
                            </span>
                          )}
                          {product.stock <= 0 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="px-3 py-1.5 bg-white text-secondary text-xs font-bold uppercase tracking-wider rounded-full">
                                Out of stock
                              </span>
                            </div>
                          )}
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
                            {product.oldPrice && (
                              <span className="text-xs text-gray-400 line-through">Rs {product.oldPrice.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-secondary mb-4">Store Details</h3>
              <dl className="space-y-3 text-sm">
                {seller.ownerName && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Owner</dt>
                    <dd className="text-secondary font-medium text-right">{seller.ownerName}</dd>
                  </div>
                )}
                {seller.businessType && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Business</dt>
                    <dd className="text-secondary font-medium">{seller.businessType}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-400">Location</dt>
                  <dd className="text-secondary font-medium text-right">
                    {[seller.city, seller.country].filter(Boolean).join(", ") || "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Products</dt>
                  <dd className="text-secondary font-medium">{seller.productCount}</dd>
                </div>
                {seller.approvedAt && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Active since</dt>
                    <dd className="text-secondary font-medium">
                      {new Date(seller.approvedAt).toLocaleDateString("en-GB", {
                        month: "short",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
