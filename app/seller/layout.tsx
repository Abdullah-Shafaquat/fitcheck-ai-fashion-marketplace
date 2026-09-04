"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import SellerSidebar from "@/Components/seller/SellerSidebar";

const getPageTitle = (pathname: string | null) => {
  if (pathname === "/seller")
    return { title: "Dashboard", subtitle: "Overview of your store performance." };
  if (pathname === "/seller/verification")
    return { title: "Identity Verification", subtitle: "Complete identity verification to start selling." };
  if (pathname === "/seller/products")
    return { title: "Products", subtitle: "Manage your product catalog." };
  if (pathname?.includes("/seller/products/new"))
    return { title: "Add Product", subtitle: "Create a new product." };
  if (pathname?.includes("/seller/products/") && !pathname?.includes("/new"))
    return { title: "Edit Product", subtitle: "Update product details." };
  if (pathname === "/seller/orders")
    return { title: "Orders", subtitle: "Manage and track your orders." };
  if (pathname?.includes("/seller/orders/"))
    return { title: "Order Details", subtitle: "View order information." };
  if (pathname === "/seller/earnings")
    return { title: "Earnings", subtitle: "Track your earnings and payouts." };
  if (pathname === "/seller/payouts")
    return { title: "Payouts", subtitle: "Request and track payouts." };
  if (pathname === "/seller/analytics")
    return { title: "Analytics", subtitle: "Store performance insights." };
  if (pathname === "/seller/notifications")
    return { title: "Notifications", subtitle: "View your alerts." };
  if (pathname === "/seller/profile")
    return { title: "Settings", subtitle: "Manage your store profile." };
  return { title: "Seller", subtitle: "Manage your store." };
};

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [approved, setApproved] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/seller/verification")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        setApproved(data?.seller?.approvalStatus === "APPROVED");
      })
      .catch(() => {
        if (active) setApproved(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isBareRoute =
    pathname === "/seller/login" || pathname === "/seller/apply";
  if (isBareRoute) {
    return <>{children}</>;
  }

  // Gate: non-approved sellers may only use the verification center,
  // notifications and profile. Redirect everything else there.
  const isRestricted =
    approved === false &&
    pathname !== "/seller/verification" &&
    !pathname?.startsWith("/seller/verification") &&
    pathname !== "/seller/notifications" &&
    pathname !== "/seller/profile";

  useEffect(() => {
    if (isRestricted) {
      router.replace("/seller/verification");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestricted]);

  // While we don't yet know the approval state (or it's restricted), show a
  // minimal shell with the verification center.
  if (approved === false && !isRestricted) {
    const { title, subtitle } = getPageTitle(pathname);
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SellerSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4">
            <div>
              <h1 className="text-lg font-bold text-[#1F1F1F]">{title}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    );
  }

  const { title, subtitle } = getPageTitle(pathname);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SellerSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4">
          <div>
            <h1 className="text-lg font-bold text-[#1F1F1F]">{title}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
