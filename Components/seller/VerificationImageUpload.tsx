"use client";

import React, { useRef, useState } from "react";
import { FiUpload, FiX, FiLoader, FiImage } from "react-icons/fi";

interface VerificationImageUploadProps {
  label: string;
  help?: string;
  kind: "cnic" | "verification_image";
  value: string; // stored private path, e.g. verification/{sellerId}/{file}
  onChange: (path: string) => void;
}

export default function VerificationImageUpload({
  label,
  help,
  kind,
  value,
  onChange,
}: VerificationImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const previewSrc = value
    ? `/api/seller/verification/file?path=${encodeURIComponent(value)}`
    : null;

  const handleFile = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG, WEBP).");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/seller/verification/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }
      onChange(data.path);
    } catch {
      setError("Network error uploading image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <div className="flex items-start gap-4">
        <div className="relative w-32 h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <FiImage size={28} className="text-gray-300" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <FiLoader size={22} className="text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1F1F1F]">{label}</p>
          {help && <p className="text-xs text-gray-400 mt-0.5">{help}</p>}

          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/30 rounded-lg px-3 py-1.5 hover:bg-[#FF6B35]/20 transition-colors disabled:opacity-50"
            >
              <FiUpload size={13} />
              {value ? "Replace" : "Upload"}
            </button>

            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <FiX size={13} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
