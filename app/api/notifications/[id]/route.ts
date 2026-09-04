import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if (auth.response) return auth.response;
    const email = auth.user.email as string;

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CUSTOMER_NOTIFICATION_PATCH]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
