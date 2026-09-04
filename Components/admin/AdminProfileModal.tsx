"use client";

import React from 'react';
import Link from 'next/link';
import {
  FiX,
  FiUser,
  FiSettings,
  FiLogOut,
  FiEdit2,
  FiKey,
  FiBell,
  FiHelpCircle,
  FiChevronRight,
  FiShield,
  FiMail,
  FiStar
} from 'react-icons/fi';
import { useModal } from '@/lib/hooks/useModal';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const AdminProfileModal: React.FC<AdminProfileModalProps> = ({ isOpen, onClose, onLogout }) => {
  useModal(isOpen, onClose);

  if (!isOpen) return null;

  const menuItems = [
    {
      icon: FiSettings,
      label: 'Settings',
      href: '/admin/settings',
      description: 'Manage store settings and preferences'
    },
    {
      icon: FiBell,
      label: 'Notifications',
      href: '/admin/dashboard',
      description: 'View admin notifications'
    },
    {
      icon: FiHelpCircle,
      label: 'FitCheck Store',
      href: '/',
      description: 'View your storefront',
      external: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col mx-auto shadow-2xl animate-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 px-6 py-8 text-center flex-shrink-0">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-lg transition text-gray-500 dark:text-gray-400"
          >
            <FiX size={20} />
          </button>

          {/* Avatar */}
          <div className="relative w-24 h-24 mx-auto mb-3">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-white dark:border-gray-700 shadow-lg">
              <FiUser className="text-primary text-4xl" />
            </div>
            <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition shadow-lg">
              <FiEdit2 size={14} />
            </button>
          </div>

          {/* User Info */}
          <h3 className="text-xl font-bold text-secondary dark:text-white">Admin</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Super Admin &bull; FitCheck Store</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Online
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">|</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">Last login: Today</span>
          </div>
        </div>

        {/* Modal Body — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { value: '245', label: 'Products', icon: FiStar },
              { value: '1.2k', label: 'Orders', icon: FiShield },
              { value: '4.8', label: 'Rating', icon: FiMail },
            ].map((stat, i) => (
              <div key={i} className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-lg font-bold text-secondary dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  {...((item as any).external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition group"
                >
                  <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-primary/10 dark:group-hover:bg-primary/20 transition">
                    <Icon size={16} className="text-gray-500 dark:text-gray-400 group-hover:text-primary transition" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{item.description}</p>
                    )}
                  </div>
                  <FiChevronRight size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-primary transition" />
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-gray-100 dark:border-gray-700" />

          {/* Logout Button */}
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition group"
          >
            <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 group-hover:bg-red-100 dark:group-hover:bg-red-500/20 transition">
              <FiLogOut size={16} />
            </div>
            <span className="font-medium">Logout</span>
            <FiChevronRight size={16} className="ml-auto text-red-400/50 group-hover:text-red-500 transition" />
          </button>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-center flex-shrink-0">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            FitCheck Admin Panel v2.0 &bull; &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminProfileModal;
