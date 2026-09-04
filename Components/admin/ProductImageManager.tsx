"use client";

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { FiUpload, FiX, FiStar, FiLink } from 'react-icons/fi';
import { FaRegStar } from 'react-icons/fa';

interface ProductImageManagerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

const ProductImageManager: React.FC<ProductImageManagerProps> = ({ images, onImagesChange }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    for (const file of fileArray) {
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Please upload JPG, PNG, or WEBP.`);
        return;
      }
      if (file.size > maxSize) {
        alert(`File too large: ${file.name}. Maximum size is 5MB.`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', { 
          method: 'POST', 
          body: formData 
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to upload ${file.name}`);
        }
        
        const data = await response.json();
        if (data.url) {
          uploadedUrls.push(data.url);
        }
        setUploadProgress(((i + 1) / fileArray.length) * 100);
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setUploading(false);
    setUploadProgress(0);
    if (uploadedUrls.length > 0) {
      onImagesChange([...images, ...uploadedUrls]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleUrlAdd = () => {
    setUrlError('');
    
    if (!imageUrl || !imageUrl.trim()) {
      setUrlError('Please enter an image URL');
      return;
    }

    try {
      const url = new URL(imageUrl.trim());
      if (!url.protocol.startsWith('http')) {
        setUrlError('Please enter a valid HTTP/HTTPS URL');
        return;
      }
      
      onImagesChange([...images, imageUrl.trim()]);
      setImageUrl('');
      setUrlError('');
    } catch {
      setUrlError('Please enter a valid URL');
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
    setFailedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleSetPrimary = (index: number) => {
    const newImages = [...images];
    const [primary] = newImages.splice(index, 1);
    newImages.unshift(primary);
    onImagesChange(newImages);
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const newImages = [...images];
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newImages.length) return;
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    onImagesChange(newImages);
  };

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
          dragOver ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/40'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => { 
            if (e.target.files && e.target.files.length > 0) {
              handleFileUpload(e.target.files);
            }
            e.target.value = '';
          }}
        />
        <FiUpload className="mx-auto text-gray-400 text-4xl mb-3" />
        <p className="text-sm text-gray-600 mb-2">Drop images here or click to browse</p>
        <p className="text-xs text-gray-400">JPG, PNG, WEBP • Max 5MB each</p>
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()} 
          className="mt-4 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Select Images'}
        </button>
        {uploading && (
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* URL Input */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setUrlError('');
            }}
            placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
            className={`flex-1 px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 ${
              urlError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200'
            }`}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUrlAdd();
              }
            }}
          />
          <button
            type="button"
            onClick={handleUrlAdd}
            className="px-4 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 active:scale-95 flex items-center gap-1 whitespace-nowrap"
          >
            <FiLink size={16} /> Add URL
          </button>
        </div>
        {urlError && (
          <p className="text-xs text-red-500 mt-1">{urlError}</p>
        )}
        <p className="text-xs text-gray-400">Supported: JPG, PNG, WEBP, GIF, SVG</p>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
          {images.map((img, index) => {
            const hasError = failedImages.has(index);
            
            return (
              <div
                key={`${img}-${index}`}
                className="group relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200 aspect-square"
              >
                {img && !hasError ? (
                  <Image
                    src={img}
                    alt={`Product image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    onError={() => handleImageError(index)}
                    unoptimized={img.startsWith('http')}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs bg-gray-100 p-2">
                    <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-center break-all line-clamp-2">{hasError ? 'Failed to load' : 'Invalid URL'}</span>
                  </div>
                )}
                
                {index === 0 && !hasError && (
                  <div className="absolute top-1 left-1 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
                    <FiStar size={10} /> Primary
                  </div>
                )}

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1">
                  <div className="flex gap-1">
                    {index > 0 && !hasError && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(index)}
                        className="p-1.5 bg-white/90 rounded-md hover:bg-white transition text-xs font-medium text-gray-700 hover:text-primary"
                        title="Set as primary"
                      >
                        <FaRegStar size={14} />
                      </button>
                    )}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMoveImage(index, 'left')}
                        className="p-1.5 bg-white/90 rounded-md hover:bg-white transition text-xs font-medium text-gray-700 hover:text-primary"
                        title="Move left"
                      >
                        ←
                      </button>
                    )}
                    {index < images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMoveImage(index, 'right')}
                        className="p-1.5 bg-white/90 rounded-md hover:bg-white transition text-xs font-medium text-gray-700 hover:text-primary"
                        title="Move right"
                      >
                        →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="p-1.5 bg-red-500/90 rounded-md hover:bg-red-500 transition"
                      title="Remove image"
                    >
                      <FiX className="text-white" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {images.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/40">
          <p className="text-sm text-gray-400">No images added yet.</p>
          <p className="text-xs text-gray-400 mt-1">Upload images or add URLs above.</p>
        </div>
      )}
    </div>
  );
};

export default ProductImageManager;