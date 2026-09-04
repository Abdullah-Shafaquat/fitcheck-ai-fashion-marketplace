import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import { getSellerOrders, countSellerOrders } from "@/lib/sellerOrders";

export async function GET(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  const pageRaw = Number(url.searchParams.get("page"));
  const pageSizeRaw = Number(url.searchParams.get("pageSize"));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw >= 1 ? Math.min(Math.floor(pageSizeRaw), 50) : 20;

  const filterOptions = {
    status: status || undefined,
    search: search || undefined,
  };
  const [orders, total] = await Promise.all([
    getSellerOrders(auth.seller.id, pageSize, { ...filterOptions, page, pageSize }),
    countSellerOrders(auth.seller.id, filterOptions),
  ]);

  return NextResponse.json({
    orders,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
