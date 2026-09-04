import { NextRequest, NextResponse } from "next/server";
import {
  serializeOrder,
  parseOrderLookup,
  findOrderByLookupKey,
} from "@/lib/payment-utils";
import { requireCustomer } from "@/lib/customer-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;

    const order = await findOrderByLookupKey(parseOrderLookup(orderNo));
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Identity is preferred from the signed session cookie. If the requester is
    // a logged-in customer, we validate against their account email.
    const auth = await requireCustomer(req);
    if (!auth.response) {
      if (auth.user.email as string !== order.email.trim().toLowerCase()) {
        return NextResponse.json(
          { error: "You are not authorized to view this order." },
          { status: 403 }
        );
      }
      return NextResponse.json({ order: serializeOrder(order) });
    }

    // Guests may still track an order, but ONLY with a valid email that matches
    // the order. Never allow an order to be read without any ownership proof.
    const emailParam = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
    if (!emailParam || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailParam)) {
      return NextResponse.json(
        { error: "You are not authorized to view this order." },
        { status: 403 }
      );
    }
    if (emailParam !== order.email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "You are not authorized to view this order." },
        { status: 403 }
      );
    }

    return NextResponse.json({ order: serializeOrder(order) });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}
