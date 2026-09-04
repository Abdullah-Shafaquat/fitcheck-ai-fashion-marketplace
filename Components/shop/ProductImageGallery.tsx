"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import {
  IoChevronBack,
  IoChevronForward,
  IoClose,
  IoExpand,
} from "react-icons/io5";
import { useModal } from "@/lib/hooks/useModal";

interface ProductImageGalleryProps {
  images: string[];
  name: string;
  badge?: string | null;
  discount?: number;
}

export default function ProductImageGallery({
  images,
  name,
  badge,
  discount,
}: ProductImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const imageRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);

  const safeImages = images?.length ? images : ["/images/placeholder.jpg"];

  // Reset to the first image whenever the actual set of images changes
  // (e.g. switching product color swaps the gallery), keyed by content.
  const imagesKey = (images || []).join("|") || "placeholder";
  useEffect(() => {
    setSelected(0);
    setLightboxIndex(0);
    setFailed(new Set());
  }, [imagesKey]);

  const markFailed = useCallback((img: string) => {
    setFailed((prev) => {
      if (prev.has(img)) return prev;
      const next = new Set(prev);
      next.add(img);
      return next;
    });
  }, []);

  const displaySrc = useCallback(
    (img: string) => (failed.has(img) ? "/images/placeholder.jpg" : img),
    [failed]
  );

  const nextImage = useCallback(
    (setter: (n: number) => void, current: number) => {
      setter((current + 1) % safeImages.length);
      setIsZoomed(false);
    },
    [safeImages.length]
  );

  const prevImage = useCallback(
    (setter: (n: number) => void, current: number) => {
      setter((current - 1 + safeImages.length) % safeImages.length);
      setIsZoomed(false);
    },
    [safeImages.length]
  );

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    setIsZoomed(false);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setIsZoomed(false);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isZoomed || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPos({ x, y });
    },
    [isZoomed]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent, inLightbox: boolean) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (inLightbox) {
        if (diff > 0) nextImage(setLightboxIndex, lightboxIndex);
        else prevImage(setLightboxIndex, lightboxIndex);
      } else {
        if (diff > 0) nextImage(setSelected, selected);
        else prevImage(setSelected, selected);
      }
    }
    touchStart.current = null;
  };

  useModal(lightboxOpen, closeLightbox);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextImage(setLightboxIndex, lightboxIndex);
      if (e.key === "ArrowLeft") prevImage(setLightboxIndex, lightboxIndex);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [lightboxOpen, lightboxIndex, nextImage, prevImage]);

  return (
    <>
      <div className="space-y-3">
        {/* Main Image */}
        <div
          ref={imageRef}
          className="relative aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-gray-100 cursor-zoom-in group img-frame"
          onClick={() => openLightbox(selected)}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, false)}
        >
          <Image
            src={displaySrc(safeImages[selected])}
            alt={`${name} - Image ${selected + 1}`}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className={`object-cover transition-transform duration-200 ${
              isZoomed ? "scale-[2]" : "scale-100"
            }`}
            style={
              isZoomed
                ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                : undefined
            }
            onError={() => markFailed(safeImages[selected])}
            priority
          />

          {badge && (
            <span className="absolute top-4 left-4 px-3 py-1.5 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-full z-10">
              {badge}
            </span>
          )}
          {discount && discount > 0 && (
            <span className="absolute top-4 right-4 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full z-10">
              -{discount}% OFF
            </span>
          )}

          {/* Zoom hint */}
          <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1.5">
            <IoExpand size={12} />
            Click to enlarge
          </div>

          {/* Nav arrows */}
          {safeImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage(setSelected, selected);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full text-secondary opacity-0 group-hover:opacity-100 transition-all hover:bg-white z-10 sm:opacity-100"
                aria-label="Previous image"
              >
                <IoChevronBack size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage(setSelected, selected);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full text-secondary opacity-0 group-hover:opacity-100 transition-all hover:bg-white z-10 sm:opacity-100"
                aria-label="Next image"
              >
                <IoChevronForward size={20} />
              </button>
            </>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full z-10">
            {selected + 1} / {safeImages.length}
          </div>
        </div>

        {/* Thumbnails */}
        {safeImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {safeImages.map((img, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelected(i);
                  setIsZoomed(false);
                }}
                className={`relative w-[72px] h-[90px] rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all duration-200 ${
                  selected === i
                    ? "border-secondary shadow-md"
                    : "border-transparent hover:border-gray-300 opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={displaySrc(img)}
                  alt=""
                  fill
                  sizes="72px"
                  className="object-cover"
                  onError={() => markFailed(img)}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10"
            aria-label="Close lightbox"
          >
            <IoClose size={24} />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 text-white text-sm px-4 py-1.5 rounded-full z-10">
            {lightboxIndex + 1} / {safeImages.length}
          </div>

          {/* Image */}
          <div
            className="relative w-full h-full max-w-4xl max-h-[85vh] mx-4"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(e, true)}
          >
            <Image
              src={displaySrc(safeImages[lightboxIndex])}
              alt={`${name} - Image ${lightboxIndex + 1}`}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-contain"
              onError={() => markFailed(safeImages[lightboxIndex])}
            />
          </div>

          {/* Prev/Next */}
          {safeImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage(setLightboxIndex, lightboxIndex);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10"
                aria-label="Previous image"
              >
                <IoChevronBack size={24} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage(setLightboxIndex, lightboxIndex);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10"
                aria-label="Next image"
              >
                <IoChevronForward size={24} />
              </button>
            </>
          )}

          {/* Thumbnail strip */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2">
            {safeImages.map((img, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(i);
                }}
                className={`relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                  lightboxIndex === i
                    ? "border-white"
                    : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <Image src={displaySrc(img)} alt="" fill sizes="48px" className="object-cover" onError={() => markFailed(img)} />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
