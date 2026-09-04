import { NextRequest, NextResponse } from "next/server";
import { getShippingMethods } from "@/lib/shipping/methods";

/**
 * Public shipping methods + authoritative server-computed costs for a given
 * cart subtotal. The client never supplies a shipping price — it only supplies
 * the subtotal used to compute free-shipping eligibility, and the final cost is
 * re-derived server-side at order creation.
 */
export async function GET(req: NextRequest) {
  const subtotal = Math.max(
    0,
    Number(req.nextUrl.searchParams.get("subtotal") || 0) || 0
  );
  const methods = (await getShippingMethods(subtotal)).map((m) => ({
    id: m.id,
    label: m.label,
    description: m.description,
    cost: m.cost,
    estimateDays: m.estimateDays,
    freeOver: m.freeOver,
  }));
  return NextResponse.json({ methods });
}
