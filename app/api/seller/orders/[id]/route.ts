import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import prisma from "@/lib/prisma";
import { getSellerOrder } from "@/lib/sellerOrders";
import { logSellerAudit } from "@/lib/sellerAudit";

const ALLOWED_FULFILLMENT = ["PENDING", "PROCESSING", "READY_TO_SHIP", "SHIPPED"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const order = await getSellerOrder(id, auth.seller.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order });
}

/**
 * Updates the fulfillment status of THIS seller's items within an order (only
 * that seller's portion). Does not alter the customer-visible central order
 * status — admin retains that control.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const status = String(body.status || "");
  if (!ALLOWED_FULFILLMENT.includes(status)) {
    return NextResponse.json({ error: "Invalid fulfillment status." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const items = Array.isArray(order.items) ? (order.items as any[]) : [];
  let touched = 0;
  const updatedItems = items.map((it: any) => {
    if (String(it.ownerSellerId) === String(auth.seller.id)) {
      touched++;
      return { ...it, fulfillmentStatus: status };
    }
    return it;
  });
  if (touched === 0) {
    return NextResponse.json({ error: "No items in this order belong to your store." }, { status: 403 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { items: JSON.parse(JSON.stringify(updatedItems)) },
  });

  await logSellerAudit({
    sellerId: auth.seller.id,
    action: "SELLER_PRODUCT_UPDATED",
    performedBy: auth.seller.id,
    target: order.orderNo,
    details: { fulfillmentStatus: status, items: touched },
  });

  const sellerView = await getSellerOrder(updated.id, auth.seller.id);
  return NextResponse.json({ order: sellerView });
}
