"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronDown } from "react-icons/fi";
import { IoCloseOutline } from "react-icons/io5";
import { useState } from "react";

const mainNavItems = [
  { name: "Home", href: "/" },
  { name: "Men", href: "/men" },
  { name: "Women", href: "/women" },
  { name: "Kids", href: "/kids" },
  { name: "New Arrivals", href: "/new-arrivals" },
  { name: "Clothing", href: "/clothing" },
  { name: "Shoes", href: "/shoes" },
  { name: "Accessories", href: "/accessories" },
];

const moreItems = [
  { name: "Dresses", href: "/dresses" },
  { name: "T-Shirts", href: "/t-shirts" },
  { name: "Jeans", href: "/jeans" },
  { name: "Jackets & Coats", href: "/jackets-coats" },
  { name: "Hoodies & Sweatshirts", href: "/hoodies-sweatshirts" },
  { name: "Activewear", href: "/activewear" },
  { name: "Bags", href: "/bags" },
  { name: "Watches", href: "/watches" },
  { name: "Sale", href: "/sale" },
];

interface NavigationProps {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (value: boolean) => void;
  isScrolled?: boolean;
}

function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const Navigation = ({ isMobileMenuOpen, setIsMobileMenuOpen, isScrolled = false }: NavigationProps) => {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const allNavItems = [...mainNavItems, ...moreItems];

  const handleLinkClick = () => setIsMobileMenuOpen?.(false);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`hidden lg:block w-full border-t ${isScrolled ? 'border-gray-200' : 'border-gray-100'}`}>
        <div className="container mx-auto px-4">
          <div className="flex h-10 items-center">
            <div className="flex items-center gap-7 whitespace-nowrap">
              {mainNavItems.map((item) => {
                const active = isNavItemActive(item.href, pathname);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group relative text-[13px] font-medium tracking-wide transition-all duration-300 hover:text-primary font-sans ${
                      active ? 'text-primary' : 'text-gray-700'
                    }`}
                  >
                    <span className="relative">
                      {item.name}
                      <span
                        className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300 ease-out ${
                          active ? 'w-full' : 'w-0 group-hover:w-full'
                        }`}
                      />
                    </span>
                  </Link>
                );
              })}

              {/* More Dropdown - Desktop */}
              <div className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-1 text-[13px] font-medium text-gray-700 transition-all duration-300 hover:text-primary font-sans"
                >
                  <span className="relative">
                    More
                    <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
                  </span>
                  <FiChevronDown
                    size={14}
                    className="transition-all duration-300 group-hover:rotate-180 group-hover:text-primary"
                  />
                </button>

                {/* Dropdown */}
                <div className="invisible absolute left-0 top-full z-50 w-56 translate-y-2 rounded-xl border border-gray-200 bg-white py-2 opacity-0 shadow-2xl transition-all duration-300 ease-out group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="py-1">
                    {moreItems.map((item) => {
                      const active = isNavItemActive(item.href, pathname);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`block px-4 py-2.5 text-[13px] font-medium transition-all duration-300 hover:bg-gray-50 hover:text-primary hover:pl-6 font-sans ${
                            active ? 'text-primary bg-gray-50' : 'text-gray-700'
                          }`}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-full sm:w-80 bg-white z-[60] transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* Close Button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setIsMobileMenuOpen?.(false)}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-300 hover:scale-110 active:scale-95"
            aria-label="Close menu"
          >
            <IoCloseOutline size={28} className="text-gray-700" />
          </button>
        </div>

        <div className="h-full overflow-y-auto px-4 pb-20 pt-20">
          <div className="mb-10">
            <span className="text-3xl font-extrabold tracking-tighter text-secondary select-none">
              FIT<span className="text-primary">CHECK</span>
            </span>
          </div>

          <div className="space-y-1">
            {allNavItems.map((item) => {
              const active = isNavItemActive(item.href, pathname);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block py-3.5 px-4 text-[15px] font-medium rounded-xl transition-all duration-300 font-sans border-b border-gray-100 ${
                    active
                      ? 'text-primary bg-gray-50 pl-6'
                      : 'text-gray-700 hover:text-primary hover:bg-gray-50 hover:pl-6'
                  }`}
                  onClick={handleLinkClick}
                >
                  {active && <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mr-2" />}
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
            <Link
              href="/login"
              className="block w-full py-3.5 px-2 text-center text-[15px] font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20 font-sans"
              onClick={handleLinkClick}
            >
              Login
            </Link>
            <Link
              href="/register"
              className="block w-full py-3.5 px-2 text-center text-[15px] font-medium text-primary border border-primary/40 rounded-xl hover:bg-orange-50 transition-all duration-300 hover:scale-[1.02] active:scale-95 font-sans"
              onClick={handleLinkClick}
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
