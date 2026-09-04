"use client";

import { useEffect } from "react";
import { IoClose } from "react-icons/io5";
import { useModal } from "@/lib/hooks/useModal";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: string;
}

const sizeData: Record<string, { headers: string[]; rows: string[][] }> = {
  Tops: {
    headers: ["Size", "Chest (in)", "Length (in)", "Sleeve (in)"],
    rows: [
      ["XS", '34-36"', '26"', '31"'],
      ["S", '36-38"', '27"', '32"'],
      ["M", '38-40"', '28"', '33"'],
      ["L", '40-42"', '29"', '34"'],
      ["XL", '42-44"', '30"', '35"'],
      ["XXL", '44-46"', '31"', '36"'],
    ],
  },
  Bottoms: {
    headers: ["Size", "Waist (in)", "Inseam (in)", "Hip (in)"],
    rows: [
      ["XS", '26-28"', '30"', '34-36"'],
      ["S", '28-30"', '30"', '36-38"'],
      ["M", '30-32"', '31"', '38-40"'],
      ["L", '32-34"', '32"', '40-42"'],
      ["XL", '34-36"', '32"', '42-44"'],
      ["XXL", '36-38"', '33"', '44-46"'],
    ],
  },
  Dresses: {
    headers: ["Size", "Bust (in)", "Waist (in)", "Hip (in)"],
    rows: [
      ["XS", '32-33"', '24-25"', '34-35"'],
      ["S", '33-35"', '25-27"', '35-37"'],
      ["M", '35-37"', '27-29"', '37-39"'],
      ["L", '37-39"', '29-31"', '39-41"'],
      ["XL", '39-41"', '31-33"', '41-43"'],
      ["XXL", '41-43"', '33-35"', '43-45"'],
    ],
  },
  Shoes: {
    headers: ["US", "EU", "UK", "Foot Length (cm)"],
    rows: [
      ["6", "38.5", "5.5", "24"],
      ["7", "39.5", "6.5", "25"],
      ["8", "40.5", "7.5", "26"],
      ["9", "42", "8.5", "27"],
      ["10", "43", "9.5", "28"],
      ["11", "44.5", "10.5", "29"],
    ],
  },
};

function getCategoryType(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("dress")) return "Dresses";
  if (c.includes("shoe") || c.includes("sneaker") || c.includes("boot")) return "Shoes";
  if (c.includes("pant") || c.includes("jean") || c.includes("short") || c.includes("skirt")) return "Bottoms";
  return "Tops";
}

export default function SizeGuideModal({ isOpen, onClose, category }: SizeGuideModalProps) {
  const type = getCategoryType(category || "");
  const data = sizeData[type] || sizeData["Tops"];

  useModal(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="size-guide-title" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 id="size-guide-title" className="text-lg font-bold text-secondary">Size Guide</h2>
            <p className="text-xs text-gray-400 mt-0.5">Measurements in inches</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close size guide"
          >
            <IoClose size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="overflow-x-auto p-6">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {data.headers.map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-orange-50/50 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className={`py-2.5 px-3 ${j === 0 ? "font-semibold text-secondary" : "text-gray-600"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400">
            <span className="font-medium text-gray-500">Tip:</span> If you&apos;re between sizes, we recommend sizing up for a more comfortable fit.
          </p>
        </div>
      </div>
    </div>
  );
}
