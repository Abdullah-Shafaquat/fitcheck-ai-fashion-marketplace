"use client";

import { usePathname } from "next/navigation";
import Header from "@/Components/layout/Header/Header";
import Footer from "@/Components/layout/Footer/Footer";
import AiAssistant from "@/Components/AI/AiAssistant";
import { StoreProvider } from "@/lib/context/StoreContext";
import { ToastProvider } from "@/Components/admin/Toast";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const isAdminRoute = pathname?.startsWith('/admin') || false;
  const isSellerRoute = pathname?.startsWith('/seller') || false;
  const isChromeRoute = isAdminRoute || isSellerRoute;

  return (
    <ToastProvider>
      <StoreProvider>
        {!isChromeRoute && <Header />}
        {children}
        {!isChromeRoute && <Footer />}
        {!isChromeRoute && <AiAssistant />}
      </StoreProvider>
    </ToastProvider>
  );
}
