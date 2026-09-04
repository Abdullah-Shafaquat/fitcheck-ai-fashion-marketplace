"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminHeader from "@/Components/admin/AdminHeader";
import AdminSidebar from "@/Components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const isAuthed = !!data.authenticated;
        if (!isAuthed && !pathname.includes("/admin/login")) {
          router.push("/admin/login");
        }
        if (isAuthed && pathname.includes("/admin/login")) {
          router.push("/admin/products");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (pathname?.includes("/admin/login")) {
    return <>{children}</>;
  }

  const getPageTitle = () => {
    if (pathname === "/admin" || pathname === "/admin/dashboard")
      return {
        title: "Dashboard",
        subtitle: "Overview of your store performance.",
      };
    if (pathname === "/admin/products")
      return {
        title: "Products",
        subtitle: "Manage your FitCheck product catalog.",
      };
    if (pathname?.includes("/admin/products/new"))
      return {
        title: "Add Product",
        subtitle: "Create a new product for your store.",
      };
    if (pathname?.includes("/admin/products/") && pathname?.includes("/edit"))
      return { title: "Edit Product", subtitle: "Update product details." };
    if (
      pathname?.includes("/admin/products/") &&
      !pathname?.includes("/edit") &&
      !pathname?.includes("/new")
    )
      return {
        title: "Product Details",
        subtitle: "View product information.",
      };
    if (pathname === "/admin/orders")
      return {
        title: "Orders",
        subtitle: "Manage and track customer orders.",
      };
    if (pathname === "/admin/customers")
      return { title: "Customers", subtitle: "View your customer base." };
    if (pathname === "/admin/notifications")
      return { title: "Notifications", subtitle: "Manage alerts and notifications." };
    if (pathname === "/admin/analytics")
      return {
        title: "Analytics",
        subtitle: "Store performance insights.",
      };
    if (pathname === "/admin/settings")
      return {
        title: "Settings",
        subtitle: "Configure your store.",
      };
    return { title: "Admin", subtitle: "Manage your store." };
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="flex min-h-screen bg-[#f8f8f8]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader title={title} subtitle={subtitle} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
