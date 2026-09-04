"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiTrash2, FiAlertTriangle, FiCheck, FiShield } from 'react-icons/fi';
import { motion } from 'motion/react';
import { useModal } from '@/lib/hooks/useModal';

interface DeleteProductDialogProps {
  isOpen: boolean;
  productName: string;
  productNames?: string[];
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  error?: string | null;
}

const DeleteProductDialog: React.FC<DeleteProductDialogProps> = ({
  isOpen,
  productName,
  productNames = [],
  onClose,
  onConfirm,
  loading,
  error,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const confirmRef = useRef<HTMLInputElement>(null);

  useModal(isOpen, onClose);

  const isBulk = productNames.length > 1;
  const displayName = isBulk ? `${productNames.length} products` : productName;
  const confirmWord = isBulk ? 'DELETE ALL' : 'DELETE';

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setTimeout(() => confirmRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmValid = confirmText.toUpperCase() === confirmWord;
  const canDelete = isConfirmValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmValid) return;
    onConfirm();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="delete-product-title" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center">
              <FiTrash2 size={20} className="text-red-500" />
            </div>
            <div>
              <h3 id="delete-product-title" className="text-lg font-bold text-secondary">
                {isBulk ? `Delete ${productNames.length} Products` : 'Delete Product'}
              </h3>
              <p className="text-xs text-gray-400">This action requires confirmation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-xl transition"
          >
            <FiX size={22} className="text-gray-400" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Warning */}
          <div className="mx-6 mt-5 p-4 bg-red-50 border border-red-100 rounded-xl">
            <div className="flex items-start gap-3">
              <FiAlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  {isBulk
                    ? `You are about to permanently delete ${productNames.length} products`
                    : <>You are about to permanently delete <span className="font-bold">&ldquo;{productName}&rdquo;</span></>
                  }
                </p>
                {isBulk && (
                  <div className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
                    {productNames.slice(0, 8).map((name) => (
                      <p key={name} className="text-xs text-red-600/70">&bull; {name}</p>
                    ))}
                    {productNames.length > 8 && (
                      <p className="text-xs text-red-600/50 italic">...and {productNames.length - 8} more</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-red-500/70 mt-2">This action cannot be undone. All data will be permanently lost.</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
              <FiShield size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500 leading-relaxed">
                Your admin session is used to authorize this deletion. This action cannot be undone.
              </p>
            </div>

            {/* Type-to-Confirm */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                Type <span className="font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{confirmWord}</span> to confirm
              </label>
              <input
                ref={confirmRef}
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type "${confirmWord}"`}
                disabled={loading}
                className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  confirmText && !isConfirmValid
                    ? 'border-red-300 focus:ring-red-200'
                    : isConfirmValid
                    ? 'border-green-300 focus:ring-green-200 bg-green-50'
                    : 'border-gray-200 focus:ring-primary/20 focus:border-primary/40'
                } disabled:opacity-50`}
              />
              {confirmText && !isConfirmValid && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">Type &ldquo;{confirmWord}&rdquo; exactly</p>
              )}
              {isConfirmValid && (
                <p className="text-xs text-green-600 mt-1.5 font-medium flex items-center gap-1">
                  <FiCheck size={12} /> Confirmation matched
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 pb-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !canDelete}
                className="flex-1 px-4 py-3 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FiTrash2 size={16} />
                    {isBulk ? `Delete ${productNames.length} Products` : 'Delete Product'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default DeleteProductDialog;
