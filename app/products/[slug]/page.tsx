"use client";

import { useState, useEffect, use, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IoHeartOutline,
  IoHeart,
  IoBagOutline,
  IoCheckmarkCircle,
  IoShareOutline,
  IoChevronForward,
  IoChevronDown,
  IoChevronUp,
  IoCarOutline,
  IoRefreshOutline,
  IoShieldCheckmarkOutline,
  IoStar,
  IoStarOutline,
  IoPencilSharp,
  IoWarningOutline,
  IoSendOutline,
} from "react-icons/io5";
import { useStore } from "@/lib/context/StoreContext";
import Breadcrumbs from "@/Components/shop/Breadcrumbs";
import ProductCard from "@/Components/shop/ProductCard";
import ProductImageGallery from "@/Components/shop/ProductImageGallery";
import SizeGuideModal from "@/Components/shop/SizeGuideModal";
import Block404 from "@/Components/NotFound/Block404";

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
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
  featured: boolean;
  latestArrival: boolean;
  isActive: boolean;
  sku?: string | null;
  createdAt: string;
  sellerInfo?: SellerInfo | null;
}

interface SellerInfo {
  id: string;
  storeName: string;
  storeSlug: string;
  logo?: string | null;
  approved: boolean;
}

interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function getVariantImages(product: Product, color: string): string[] {
  if (product.colorImages && typeof product.colorImages === "object") {
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
      if (list.length > 0) return list;
    }
  }
  return product.images?.length ? product.images : ["/images/placeholder.jpg"];
}

function getStockLabel(stock: number): { text: string; color: string } {
  if (stock === 0) return { text: "Out of Stock", color: "text-red-500" };
  if (stock <= 10) return { text: `Only ${stock} left — order soon`, color: "text-orange-500" };
  return { text: "In Stock", color: "text-green-600" };
}

function formatReviewDate(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "Today";
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
    }
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { addToCart, addToWishlist, removeFromWishlist, isInWishlist, addRecentlyViewed } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [shareTooltip, setShareTooltip] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>(["description"]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFormError, setReviewFormError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewForm, setReviewForm] = useState({ author: "", rating: 5, comment: "" });

  const fetchProduct = useCallback(async () => {
    setLoadError(false);
    let found = false;
    try {
      const res = await fetch(`/api/products/slug/${slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.product) {
          setProduct(data.product);
          setRelatedProducts(data.related || []);
          if (data.product.sizes?.length) setSelectedSize(data.product.sizes[0]);
          if (data.product.colors?.length) setSelectedColor(data.product.colors[0]);
          addRecentlyViewed(data.product);
          found = true;
        } else {
          setProduct(null);
        }
      } else {
        setProduct(null);
      }
    } catch {
      setProduct(null);
    }
    if (!found) {
      // Fallback: genuine "not found" if the product exists nowhere,
      // but a real API failure here is surfaced as an error state.
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Catalog unavailable");
        const data = await res.json();
        const products: Product[] = data.products || data;
        const fallback = products.find((p) => p.slug === slug);
        if (fallback) {
          setProduct(fallback);
          setRelatedProducts(
            products
              .filter((p) => p.id !== fallback.id && (p.category === fallback.category || p.gender === fallback.gender))
              .slice(0, 8)
          );
          if (fallback.sizes?.length) setSelectedSize(fallback.sizes[0]);
          if (fallback.colors?.length) setSelectedColor(fallback.colors[0]);
          addRecentlyViewed(fallback);
          found = true;
        }
      } catch {
        setLoadError(true);
      }
    }
    setLoading(false);
  }, [slug, addRecentlyViewed]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fitcheck-reviewer");
      if (saved) setReviewForm((v) => ({ ...v, author: saved }));
    } catch {}
  }, []);

  const handleAddToCart = () => {
    if (!product) return;
    if (product.sizes.length > 0 && !selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    addToCart(product, selectedSize, selectedColor, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    if (!sizeError) window.location.href = "/checkout";
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try { await navigator.share({ title: product?.name, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setShareTooltip(true);
      setTimeout(() => setShareTooltip(false), 2000);
    }
  };

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const fetchReviews = useCallback(async (productId: string) => {
    setReviewsLoading(true);
    setReviewsError("");
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      setReviewsError("We couldn't load reviews for this product.");
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (product?.id) fetchReviews(product.id);
  }, [product?.id, fetchReviews]);

  useEffect(() => {
    if (!reviewSuccess || !reviewForm.author) return;
    try {
      localStorage.setItem("fitcheck-reviewer", reviewForm.author);
    } catch {}
  }, [reviewSuccess, reviewForm.author]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setReviewFormError("");
    setReviewSuccess("");
    const author = reviewForm.author.trim();
    if (author.length < 2) {
      setReviewFormError("Please enter your name.");
      return;
    }
    if (reviewForm.comment.trim().length < 4) {
      setReviewFormError("Please write a short review.");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author,
          rating: reviewForm.rating,
          comment: reviewForm.comment.trim(),
        }),
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login?redirect=" + encodeURIComponent(`/products/${product.slug}`);
        return;
      }
      if (!res.ok || !data.review) {
        throw new Error(data.error || "Failed to submit review");
      }
      setReviews((prev) => [data.review, ...prev]);
      if (typeof data.productRating === "number") {
        setProduct({ ...product, rating: data.productRating, reviews: data.productReviewCount });
      }
      setReviewSuccess("Thanks for your review!");
      setReviewForm({ author, rating: reviewForm.rating, comment: "" });
      setReviewOpen(false);
    } catch (err) {
      setReviewFormError(err instanceof Error ? err.message : "Could not submit your review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4 mb-6">
            <div className="bg-gray-200 h-3 rounded w-48" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-3">
              <div className="bg-gray-200 rounded-2xl aspect-[4/5]" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-[72px] h-[90px] bg-gray-200 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-200 h-4 rounded w-1/3" />
              <div className="bg-gray-200 h-8 rounded w-2/3" />
              <div className="bg-gray-200 h-5 rounded w-1/4" />
              <div className="bg-gray-200 h-4 rounded w-1/3" />
              <div className="bg-gray-200 h-12 rounded w-full" />
              <div className="bg-gray-200 h-14 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // API/UNAVAILABLE STATE
  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4 py-24">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 3v4m0 8v2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Something Went Wrong</h1>
          <p className="text-sm text-gray-400 mb-8">
            We couldn&apos;t load this product. Please check your connection and try again.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setLoadError(false);
                setLoading(true);
                setProduct(null);
                fetchProduct();
              }}
              className="px-6 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all"
            >
              Try Again
            </button>
            <Link href="/shop" className="px-6 py-3 border border-gray-200 text-secondary text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // NOT FOUND STATE — interactive shatter 404
  if (!product) {
    return <Block404 />;
  }

  const inWishlist = isInWishlist(product.id);
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;
  const savings = product.oldPrice ? product.oldPrice - product.price : 0;
  const stockInfo = getStockLabel(product.stock);
  const currentImages = getVariantImages(product, selectedColor);
  const unavailable = product.isActive === false;

  const breadcrumbItems = [
    { label: "Shop", href: "/" },
    ...(product.gender ? [{ label: product.gender, href: `/${product.gender.toLowerCase()}` }] : []),
    ...(product.category ? [{ label: product.category, href: `/${product.category.toLowerCase()}` }] : []),
    ...(product.subCategory ? [{ label: product.subCategory, href: `/${product.subCategory.toLowerCase().replace(/\s+/g, "-")}` }] : []),
    { label: product.name },
  ];

  const accordionSections = [
    {
      key: "description",
      title: "Description",
      content: product.description || "No description available for this product.",
    },
    {
      key: "details",
      title: "Product Details",
      content: null,
      details: [
        product.category && { label: "Category", value: product.category },
        product.subCategory && { label: "Sub-Category", value: product.subCategory },
        product.gender && { label: "Gender", value: product.gender },
        product.sku && { label: "SKU", value: product.sku },
        product.sizes.length > 0 && { label: "Sizes", value: product.sizes.join(", ") },
        product.colors.length > 0 && { label: "Colors", value: product.colors.join(", ") },
      ].filter(Boolean) as { label: string; value: string }[],
    },
    {
      key: "shipping",
      title: "Shipping & Returns",
      content: null,
      items: [
        "Free shipping on orders over Rs 5,000",
        "Standard delivery: 3-5 business days",
        "Express delivery: 1-2 business days",
        "30-day return policy for unworn items",
        "Exchange available for different sizes",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Image Gallery */}
          <ProductImageGallery
            images={currentImages}
            name={product.name}
            badge={product.badge}
            discount={discount}
          />

          {/* Right: Product Info */}
          <div className="space-y-5">
            {/* Category */}
            <div className="flex items-center gap-2 text-[11px] text-gray-400 uppercase tracking-[0.18em] font-semibold">
              {product.gender && <span>{product.gender}</span>}
              {product.gender && product.category && <span className="text-primary">&middot;</span>}
              {product.category && <span>{product.category}</span>}
              {product.subCategory && (
                <>
                  <span className="text-primary">&middot;</span>
                  <span>{product.subCategory}</span>
                </>
              )}
            </div>

            {/* Name */}
            <h1 className="editorial-title text-3xl md:text-4xl xl:text-[2.75rem] leading-[1.05]">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-3">
              {product.rating > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className={`w-4 h-4 ${star <= Math.round(product.rating) ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">{product.rating.toFixed(1)} ({product.reviews} reviews)</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">No reviews yet</span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-bold text-secondary">Rs {product.price.toLocaleString()}</span>
              {product.oldPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">Rs {product.oldPrice.toLocaleString()}</span>
                  <span className="text-sm font-semibold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                    Save Rs {savings.toLocaleString()} ({discount}% off)
                  </span>
                </>
              )}
            </div>

            {/* SKU */}
            {product.sku && (
              <p className="text-xs text-gray-400">SKU: <span className="font-mono text-gray-500">{product.sku}</span></p>
            )}

            {/* Sold by */}
            {product.sellerInfo?.approved && (
              <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-[var(--shadow-lift)]">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                  {product.sellerInfo.logo ? (
                    <Image src={product.sellerInfo.logo} alt={product.sellerInfo.storeName} width={44} height={44} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white">
                      <Image src="/logos/top-logo.png" alt={product.sellerInfo.storeName} width={30} height={30} className="object-contain w-full h-full" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400">Sold by</p>
                  <Link
                    href={`/store/${product.sellerInfo.storeSlug}`}
                    className="text-sm font-semibold text-secondary hover:text-primary transition-colors truncate block"
                  >
                    {product.sellerInfo.storeName}
                  </Link>
                </div>
                <Link
                  href={`/store/${product.sellerInfo.storeSlug}`}
                  className="px-4 py-2.5 bg-secondary text-white text-xs font-bold rounded-full hover:bg-primary transition-all whitespace-nowrap flex-shrink-0 shadow-[0_8px_20px_-10px_rgba(20,20,30,0.5)]"
                >
                  Visit Store
                </Link>
              </div>
            )}

            {/* Color Selector */}
            {product.colors.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-secondary mb-3">
                  Color: <span className="font-normal text-gray-500">{selectedColor || "Select"}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const hasImages = product.colorImages && typeof product.colorImages === "object" &&
                      Object.keys(product.colorImages).some((k) => k.toLowerCase() === color.toLowerCase());
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`relative px-4 py-2 text-sm rounded-xl border-2 transition-all duration-200 ${
                          selectedColor === color
                            ? "border-secondary bg-secondary text-white shadow-md"
                            : "border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {color}
                        {selectedColor === color && (
                          <IoCheckmarkCircle size={14} className="absolute -top-1.5 -right-1.5 text-primary fill-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {product.sizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-secondary">
                    Size: <span className="font-normal text-gray-500">{selectedSize || "Select a size"}</span>
                    {sizeError && <span className="text-red-500 font-normal ml-1">(Required)</span>}
                  </p>
                  <button onClick={() => setSizeGuideOpen(true)} className="text-xs text-primary hover:underline font-medium">
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => { setSelectedSize(size); setSizeError(false); }}
                      className={`min-w-[52px] px-4 py-2.5 text-sm rounded-xl border-2 transition-all duration-200 ${
                        selectedSize === size
                          ? "border-secondary bg-secondary text-white shadow-md"
                          : "border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <p className="text-sm font-semibold text-secondary mb-3">Quantity</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-11 h-11 flex items-center justify-center text-lg font-medium text-gray-600 hover:bg-gray-50 transition-all"
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="w-14 h-11 flex items-center justify-center text-sm font-bold text-secondary border-x-2 border-gray-200">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-11 h-11 flex items-center justify-center text-lg font-medium text-gray-600 hover:bg-gray-50 transition-all"
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
                <span className={`text-xs font-medium ${stockInfo.color}`}>
                  {stockInfo.text}
                </span>
              </div>
            </div>

            {unavailable && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                <IoWarningOutline size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">This product is currently unavailable</p>
                  <p className="text-xs text-amber-600/80 mt-0.5">
                    It has been removed from the catalog and can no longer be purchased.
                  </p>
                </div>
              </div>
            )}

            {/* Add to Cart + Buy Now + Wishlist + Share */}
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-3 flex-1 min-w-0">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || unavailable}
                  className={`flex-1 min-w-0 py-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    addedToCart
                      ? "bg-green-500 text-white"
                      : product.stock === 0 || unavailable
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-secondary text-white hover:bg-primary active:scale-[0.98]"
                  }`}
                >
                  <IoBagOutline size={18} className="flex-shrink-0" />
                  <span className="truncate">{addedToCart ? "Added to Cart!" : "Add to Cart"}</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0 || unavailable}
                  className={`px-5 py-4 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                    product.stock === 0 || unavailable
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
                  }`}
                >
                  Buy Now
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => (inWishlist ? removeFromWishlist(product.id) : addToWishlist(product))}
                  className={`w-14 h-14 flex items-center justify-center rounded-xl border-2 transition-all duration-200 ${
                    inWishlist
                      ? "bg-red-50 border-red-200 text-red-500"
                      : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50"
                  }`}
                  aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                >
                  {inWishlist ? <IoHeart size={22} className="fill-red-500" /> : <IoHeartOutline size={22} />}
                </button>
                <div className="relative">
                  <button
                    onClick={handleShare}
                    className="w-14 h-14 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200"
                    aria-label="Share product"
                  >
                    <IoShareOutline size={22} />
                  </button>
                  {shareTooltip && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-secondary text-white text-xs px-3 py-1 rounded-full whitespace-nowrap">
                      Link copied!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 py-4 border-t border-b border-gray-100">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <IoCarOutline size={20} className="text-primary" />
                <span className="text-[11px] text-gray-500 font-medium leading-tight">Free Shipping<br />on Rs 5,000+</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <IoRefreshOutline size={20} className="text-primary" />
                <span className="text-[11px] text-gray-500 font-medium leading-tight">Easy Returns<br />30-day policy</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <IoShieldCheckmarkOutline size={20} className="text-primary" />
                <span className="text-[11px] text-gray-500 font-medium leading-tight">Secure Checkout<br />100% protected</span>
              </div>
            </div>

            {/* Accordion Sections */}
            <div className="space-y-0">
              {accordionSections.map((section) => {
                const isOpen = openAccordions.includes(section.key);
                return (
                  <div key={section.key} className="border-b border-gray-100">
                    <button
                      onClick={() => toggleAccordion(section.key)}
                      className="w-full flex items-center justify-between py-4 text-left"
                    >
                      <span className="text-sm font-semibold text-secondary">{section.title}</span>
                      {isOpen ? (
                        <IoChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <IoChevronDown size={16} className="text-gray-400" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="pb-4 text-sm text-gray-600 leading-relaxed">
                        {section.key === "details" && section.details ? (
                          <ul className="space-y-2.5">
                            {section.details.map((d) => (
                              <li key={d.label} className="flex justify-between py-1.5 border-b border-gray-50">
                                <span className="font-medium text-secondary">{d.label}</span>
                                <span className="text-gray-500">{d.value}</span>
                              </li>
                            ))}
                          </ul>
                        ) : section.key === "shipping" && section.items ? (
                          <ul className="space-y-2">
                            {section.items.map((item, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <IoCheckmarkCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>{section.content}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reviews Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-secondary">Customer Reviews ({product.reviews})</h3>
                  {product.rating > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= Math.round(product.rating) ? "text-yellow-400" : "text-gray-200"}`}
                          fill="currentColor" viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="text-[11px] text-gray-400">{product.rating.toFixed(1)} average</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setReviewOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary/5 text-primary text-xs font-bold rounded-xl hover:bg-primary/10 transition-all"
                >
                  <IoPencilSharp size={13} />
                  Write a Review
                </button>
              </div>

              {reviewsError && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
                  <IoWarningOutline size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-semibold text-amber-700">{reviewsError}</p>
                </div>
              )}

              {reviewSuccess && (
                <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4">
                  <IoCheckmarkCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-semibold text-emerald-700">{reviewSuccess}</p>
                </div>
              )}

              {reviewOpen && (
                <form onSubmit={submitReview} className="mb-5 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm animate-in slide-in-from-bottom-2 duration-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-secondary">Share your thoughts</p>
                    <button type="button" onClick={() => setReviewOpen(false)} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Your Rating</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setReviewForm((v) => ({ ...v, rating: s }))}
                          className="p-0.5 transition-transform hover:scale-110"
                          aria-label={`${s} star${s === 1 ? "" : "s"}`}
                        >
                          <IoStar
                            size={26}
                            className={`${s <= reviewForm.rating ? "text-yellow-400" : "text-gray-200 hover:text-yellow-200"} transition-colors`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-xs text-gray-400 font-medium">
                        {reviewForm.rating}/{5}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Name</label>
                    <input
                      value={reviewForm.author}
                      onChange={(e) => setReviewForm((v) => ({ ...v, author: e.target.value }))}
                      placeholder="e.g. Ahmed K."
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Review</label>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm((v) => ({ ...v, comment: e.target.value }))}
                      rows={3}
                      placeholder="What did you like? How was the fit and quality?"
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none"
                    />
                  </div>

                  {reviewFormError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                      <IoWarningOutline size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-semibold text-red-600">{reviewFormError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submittingReview ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <IoSendOutline size={14} />
                        Submit Review
                      </>
                    )}
                  </button>
                </form>
              )}

              {reviewsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full" />
                        <div className="h-3 bg-gray-200 rounded w-24" />
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary to-[#1F1F1F] rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0">
                          <span className="text-xs font-black uppercase">
                            {(review.author || "?").charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-secondary">{review.author}</p>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <IoStar
                                key={s}
                                size={12}
                                className={s <= review.rating ? "text-yellow-400" : "text-gray-200"}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                          {formatReviewDate(review.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <IoStarOutline size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No reviews yet</p>
                  <p className="text-xs text-gray-300 mt-1">Be the first to review this product</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-secondary">You May Also Like</h2>
              <Link
                href={`/${product.gender.toLowerCase()}`}
                className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
              >
                View All <IoChevronForward size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

        {/* Recently Viewed */}
        <RecentlyViewedSection currentProductId={product.id} />
      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal isOpen={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} category={product.category} />
    </div>
  );
}

function RecentlyViewedSection({ currentProductId }: { currentProductId: string }) {
  const { recentlyViewed } = useStore();
  const items = recentlyViewed.filter((item) => item.id !== currentProductId).slice(0, 6);

  if (items.length === 0) return null;

  return (
    <div className="mt-16">
      <h2 className="text-xl md:text-2xl font-bold text-secondary mb-6">Recently Viewed</h2>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
        {items.map((item) => (
          <Link key={item.id} href={`/products/${item.slug}`} className="group block">
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100">
              <Image src={item.image} alt={item.name} fill sizes="150px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
            </div>
            <p className="text-xs text-secondary mt-2 truncate font-medium group-hover:text-primary transition-colors">{item.name}</p>
            <p className="text-xs font-bold text-secondary mt-0.5">Rs {item.price.toLocaleString()}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
