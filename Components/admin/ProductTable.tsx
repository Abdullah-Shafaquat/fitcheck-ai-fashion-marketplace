"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FiEye, FiEdit2, FiTrash2, FiStar, FiClock } from "react-icons/fi";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  category: string;
  gender: string;
  images: string[];
  stock: number;
  featured: boolean;
  latestArrival: boolean;
  isActive: boolean;
  badge?: string;
}

interface ProductTableProps {
  products: Product[];
  onDelete: (id: string) => void;
  selectedProducts?: Set<string>;
  onToggleSelect?: (id: string) => void;
  selectAll?: boolean;
  onToggleSelectAll?: () => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onDelete,
  selectedProducts = new Set(),
  onToggleSelect,
  selectAll = false,
  onToggleSelectAll,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-50">
            <th className="text-left py-3 px-4 w-10">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={onToggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]/20 cursor-pointer"
              />
            </th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Product
            </th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Category
            </th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Gender
            </th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Price
            </th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Stock
            </th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Flags
            </th>
            <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="text-right py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors"
            >
              <td className="py-3 px-4">
                <input
                  type="checkbox"
                  checked={selectedProducts.has(product.id)}
                  onChange={() => onToggleSelect?.(product.id)}
                  className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]/20 cursor-pointer"
                />
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {product.images && product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-[10px]">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1F1F1F] truncate max-w-[200px]">
                      {product.name}
                    </p>
                    {product.badge && (
                      <span className="inline-block text-[10px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-2 py-0.5 rounded-full mt-0.5">
                        {product.badge}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {product.category}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {product.gender}
              </td>
              <td className="py-3 px-4">
                <p className="text-sm font-bold text-[#1F1F1F] tabular-nums">
                  Rs {product.price.toLocaleString()}
                </p>
                {product.oldPrice && (
                  <p className="text-xs text-gray-400 line-through tabular-nums">
                    Rs {product.oldPrice.toLocaleString()}
                  </p>
                )}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`text-sm font-bold tabular-nums ${
                    product.stock === 0
                      ? "text-red-500"
                      : product.stock < 10
                        ? "text-amber-500"
                        : "text-emerald-600"
                  }`}
                >
                  {product.stock}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-1">
                  {product.featured && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <FiStar size={10} /> Featured
                    </span>
                  )}
                  {product.latestArrival && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <FiClock size={10} /> Latest
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full ${
                    product.isActive
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {product.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 rounded-lg transition-colors"
                    title="View"
                  >
                    <FiEye size={15} />
                  </Link>
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <FiEdit2 size={15} />
                  </Link>
                  <button
                    onClick={() => onDelete(product.id)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;
