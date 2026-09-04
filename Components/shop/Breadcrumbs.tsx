"use client";

import Link from "next/link";
import { IoChevronForward } from "react-icons/io5";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
      <Link href="/" className="hover:text-primary transition-colors duration-200">
        Home
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <IoChevronForward size={10} />
          {item.href ? (
            <Link href={item.href} className="hover:text-primary transition-colors duration-200">
              {item.label}
            </Link>
          ) : (
            <span className="text-secondary font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
