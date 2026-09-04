"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  IoPersonOutline,
  IoBagOutline,
  IoHeartOutline,
  IoLogOutOutline,
  IoSettingsOutline,
  IoLocationOutline,
} from "react-icons/io5";

interface UserData {
  name: string;
  email: string;
  provider?: string;
  image?: string | null;
}

export default function AccountDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const readUser = () => {
    try {
      const raw = localStorage.getItem("fitcheck-user");
      if (raw) {
        const parsed = JSON.parse(raw) as UserData;
        if (parsed?.name && parsed?.email) {
          setIsLoggedIn(true);
          setUser(parsed);
          return;
        }
      }
    } catch {}
    setIsLoggedIn(false);
    setUser(null);
  };

  useEffect(() => {
    readUser();
    const handleStorage = () => readUser();
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(readUser, 1000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("fitcheck-user");
    setIsLoggedIn(false);
    setUser(null);
    setIsOpen(false);
    window.location.href = "/";
  };

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  if (!isLoggedIn || !user) {
    return (
      <div className="flex items-center gap-3 text-xs font-semibold tracking-wide">
        <Link
          href="/login"
          className="relative text-gray-700 hover:text-[#FF6B35] transition-colors duration-300 after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:w-0 after:h-[2px] after:bg-[#FF6B35] after:rounded-full after:transition-all after:duration-300 hover:after:w-full"
        >
          LOGIN
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href="/register"
          className="relative text-gray-700 hover:text-[#FF6B35] transition-colors duration-300 after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:w-0 after:h-[2px] after:bg-[#FF6B35] after:rounded-full after:transition-all after:duration-300 hover:after:w-full"
        >
          REGISTER
        </Link>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#e05a2b] flex items-center justify-center text-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95 group"
        aria-label="Account menu"
      >
        {user.image ? (
          <img
            src={user.image}
            alt="Profile photo"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-[11px] font-bold tracking-wide group-hover:scale-110 transition-transform">
            {initials}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                {user.image ? (
                  <img
                    src={user.image}
                    alt="Profile photo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-white text-xs font-bold">{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/account"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#FF6B35] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <IoPersonOutline size={16} />
              My Account
            </Link>
            <Link
              href="/orders"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#FF6B35] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <IoBagOutline size={16} />
              My Orders
            </Link>
            <Link
              href="/wishlist"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#FF6B35] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <IoHeartOutline size={16} />
              Wishlist
            </Link>
            <Link
              href="/account"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#FF6B35] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <IoLocationOutline size={16} />
              Addresses
            </Link>
            <Link
              href="/account/settings"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#FF6B35] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <IoSettingsOutline size={16} />
              Settings
            </Link>
          </div>

          <div className="border-t border-gray-100 pt-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full"
            >
              <IoLogOutOutline size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}