import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildSellerList } from "@/lib/sellerAdmin";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin) return admin;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "All";
  const q = url.searchParams.get("q") || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize")) || 25));

  const { total, sellers } = await buildSellerList({ page, pageSize, status, q });

  return NextResponse.json({
    sellers,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
