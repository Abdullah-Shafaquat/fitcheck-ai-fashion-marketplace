"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  FiEdit2, 
  FiTrash2, 
  FiArrowLeft, 
  FiStar, 
  FiClock, 
  FiPackage,
  FiCheck,
  FiX,
  FiTag,
  FiGrid,
  FiUser,
  FiShoppingBag,
} from 'react-icons/fi';
import { useToast } from '@/Components/admin/Toast';

import DeleteProductDialog from '@/Components/admin/DeleteProductDialog';


interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  oldPrice?: number;
  category: string;
  subCategory?: string;
  gender: string;
  sizes: string[];
  colors: string[];
  images: string[];
  colorImages?: Record<string, string[]> | Record<string, string>;
  stock: number;
  sku?: string;
  rating: number;
  reviews: number;
  badge?: string;
  featured: boolean;
  latestArrival: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ProductViewPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { error: toastError } = useToast();
  const id = params?.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError('Product ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/products/${id}`);

        if (response.ok) {
          const data = await response.json();
          setProduct(data);
        } else if (response.status === 404) {
          setError('Product not found');
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to fetch product');
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        setError('An error occurred while fetching the product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (response.ok) {
        router.push('/admin/products');
      } else {
        const errorData = await response.json();
        toastError(errorData.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      toastError('An error occurred while deleting the product');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-secondary mb-2">{error || 'Product not found'}</h2>
          <p className="text-gray-500 mb-6">The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/admin/products" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition">
            <FiArrowLeft size={18} />
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'New': return 'bg-green-500';
      case 'Best Seller': return 'bg-yellow-500';
      case 'Featured': return 'bg-primary';
      case 'Limited': return 'bg-purple-500';
      case 'Sale': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/products"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <FiArrowLeft size={20} className="text-gray-500" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-secondary">{product.name}</h1>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {product.isActive ? 'Active' : 'Inactive'}
                </span>
                {product.badge && (
                  <span className={`px-2 py-0.5 text-xs font-bold text-white rounded-full ${getBadgeColor(product.badge)}`}>
                    {product.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">Product ID: {product.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/products/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <FiEdit2 size={18} />
              Edit
            </Link>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              <FiTrash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        {/* Product Details - Read Only */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Images - Left Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-50 mb-4">
                {product.images && product.images.length > 0 && (
                  <Image
                    src={product.images[selectedImage]}
                    alt={product.name}
                    fill
                    className="object-contain"
                    priority
                  />
                )}
                {product.badge && (
                  <span className={`absolute top-3 left-3 px-3 py-1 text-white text-xs font-bold rounded-full shadow-lg shadow-primary/30 ${getBadgeColor(product.badge)}`}>
                    {product.badge}
                  </span>
                )}
                <div className="absolute top-3 right-3 flex gap-1">
                  {product.featured && (
                    <span className="px-2 py-1 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                      <FiStar size={12} /> Featured
                    </span>
                  )}
                  {product.latestArrival && (
                    <span className="px-2 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                      <FiClock size={12} /> Latest
                    </span>
                  )}
                </div>
              </div>
              
              {/* Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${
                        selectedImage === index ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Color-Wise Images */}
              {product.colorImages && typeof product.colorImages === 'object' && Object.keys(product.colorImages).length > 0 && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
                    <FiShoppingBag size={16} className="text-primary" />
                    Color-Wise Images
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(product.colorImages).map(([color, value]) => {
                      const list = Array.isArray(value)
                        ? value
                        : typeof value === 'string' && value.trim()
                          ? [value]
                          : [];
                      if (list.length === 0) return null;
                      return (
                        <div key={color}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                              {color}
                            </span>
                            <span className="text-[11px] text-gray-400">{list.length} image{list.length === 1 ? '' : 's'}</span>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {list.map((img, idx) => (
                              <div
                                key={`${color}-${idx}`}
                                className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-50"
                              >
                                <Image
                                  src={img}
                                  alt={`${color} - image ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details - Right Column */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                  <FiTag size={14} />
                  <span>Price</span>
                </div>
                <p className="text-xl font-bold text-secondary">Rs {product.price.toLocaleString()}</p>
                {product.oldPrice && (
                  <p className="text-xs text-gray-400 line-through">Rs {product.oldPrice.toLocaleString()}</p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                  <FiPackage size={14} />
                  <span>Stock</span>
                </div>
                <p className={`text-xl font-bold ${product.stock === 0 ? 'text-red-500' : product.stock < 10 ? 'text-orange-500' : 'text-green-600'}`}>
                  {product.stock}
                </p>
                <p className="text-xs text-gray-400">{product.stock === 0 ? 'Out of stock' : product.stock < 10 ? 'Low stock' : 'In stock'}</p>
              </div>
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
                <FiGrid size={16} className="text-primary" />
                Product Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between pb-2 border-b border-gray-50">
                  <span className="text-gray-500">Category</span>
                  <span className="text-secondary font-medium">{product.category}</span>
                </div>
                {product.subCategory && (
                  <div className="flex justify-between pb-2 border-b border-gray-50">
                    <span className="text-gray-500">Sub-Category</span>
                    <span className="text-secondary font-medium">{product.subCategory}</span>
                  </div>
                )}
                <div className="flex justify-between pb-2 border-b border-gray-50">
                  <span className="text-gray-500">Gender</span>
                  <span className="text-secondary font-medium">{product.gender}</span>
                </div>
                {product.sku && (
                  <div className="flex justify-between pb-2 border-b border-gray-50">
                    <span className="text-gray-500">SKU</span>
                    <span className="text-secondary font-medium">{product.sku}</span>
                  </div>
                )}
                <div className="flex justify-between pb-2 border-b border-gray-50">
                  <span className="text-gray-500">Rating</span>
                  <span className="text-secondary font-medium flex items-center gap-1">
                    <FiStar className="text-primary fill-primary" size={14} />
                    {product.rating} ({product.reviews} reviews)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-secondary font-medium">{new Date(product.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Sizes & Colors */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
                <FiShoppingBag size={16} className="text-primary" />
                Sizes & Colors
              </h3>
              <div className="space-y-3">
                {product.sizes && product.sizes.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Available Sizes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.sizes.map((size) => (
                        <span key={size} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {product.colors && product.colors.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Available Colors</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.colors.map((color) => (
                        <span key={color} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
                  <FiTag size={16} className="text-primary" />
                  Description
                </h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <DeleteProductDialog
        isOpen={deleteDialogOpen}
        productName={product.name}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
};

export default ProductViewPage;