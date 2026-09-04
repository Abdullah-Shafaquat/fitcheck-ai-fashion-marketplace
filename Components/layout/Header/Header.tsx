"use client";

import Image from 'next/image'
import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import { IoHeartOutline, IoBagOutline, IoMenuOutline, IoCloseOutline, IoSearchOutline } from 'react-icons/io5'
import { useStore } from '@/lib/context/StoreContext'
import { useModal } from '@/lib/hooks/useModal'
import AccountDropdown from './AccountDropdown'
import CustomerNotificationBell from '@/Components/orders/CustomerNotificationBell'
import Navigation from './Navigation'
import SearchOverlay from './SearchOverlay'

const Header = () => {
  const { getCartCount, getWishlistCount } = useStore()
  const cartCount = getCartCount()
  const wishlistCount = getWishlistCount()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useModal(isMobileMenuOpen, () => setIsMobileMenuOpen(false))

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isScrolled
            ? 'bg-white/85 backdrop-blur-2xl border-b border-gray-200/70 shadow-[var(--shadow-lift)]'
            : 'bg-white/60 backdrop-blur-lg border-b border-gray-100'
        }`}
      >
        <div className={`transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isScrolled ? 'py-2' : 'py-4'}`}>
          <div className="container mx-auto flex items-center justify-between px-3 sm:px-4">

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="block lg:hidden text-secondary hover:text-primary transition-all duration-300 p-1 hover:scale-110 active:scale-95"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <IoCloseOutline size={28} /> : <IoMenuOutline size={28} />}
            </button>

            {/* Logo */}
            <div className="logo flex-shrink-0">
              <Link href="/" className="group block transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99]" aria-label="FitCheck home">
                <Image
                  src="/logos/main-logo.png"
                  alt="FitCheck"
                  width={200}
                  height={56}
                  priority
                  className="h-11 w-auto object-contain select-none drop-shadow-[0_2px_6px_rgba(20,20,30,0.08)] transition-all duration-300 group-hover:drop-shadow-[0_4px_12px_rgba(255,107,53,0.25)]"
                />
              </Link>
            </div>

            {/* Search (desktop) */}
            <div className="hidden md:flex flex-1 max-w-md mx-4 items-center">
              <button
                onClick={() => setSearchOpen(true)}
                className="group flex w-full items-center gap-3 rounded-full border border-gray-200/80 bg-white/80 px-5 py-2.5 text-sm text-gray-400 shadow-[var(--shadow-soft)] transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] focus-visible:outline-2 focus-visible:outline-primary/50"
                aria-label="Open search"
              >
                <IoSearchOutline size={18} className="text-gray-400 transition-colors group-hover:text-primary" />
                <span>Search products...</span>
                <span className="ml-auto hidden lg:inline rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-400">↵</span>
              </button>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-1 sm:space-x-3 md:space-x-4 text-sm font-medium">
              {/* Mobile search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="block md:hidden text-secondary hover:text-primary p-1 hover:scale-110 transition-all"
                aria-label="Search"
              >
                <IoSearchOutline size={24} />
              </button>

              <div className="hidden sm:flex items-center gap-1">
                <CustomerNotificationBell />
                <AccountDropdown />
              </div>

              <div className="flex items-center space-x-1 sm:space-x-3">
                {/* Wishlist */}
                <Link
                  href="/wishlist"
                  className="group relative text-secondary transition-all duration-300 hover:text-primary hover:scale-110 active:scale-95"
                  aria-label="Wishlist"
                >
                  <IoHeartOutline size={22} className="transition-transform duration-300 group-hover:scale-110" />
                  {wishlistCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-md ring-2 ring-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                {/* Cart */}
                <Link
                  href="/cart"
                  className="group relative text-secondary transition-all duration-300 hover:text-primary"
                  aria-label="Cart"
                >
                  <IoBagOutline size={22} className="transition-transform duration-300 group-hover:scale-110" />
                  {cartCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-md ring-2 ring-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <Navigation isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} isScrolled={isScrolled} />

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

export default Header
