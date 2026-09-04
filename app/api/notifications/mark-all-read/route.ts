import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if (auth.response) return auth.response;
    const email = auth.user.email as string;

    await prisma.notification.updateMany({
      where: {
        userId: email.trim().toLowerCase(),
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CUSTOMER_NOTIFICATIONS_MARK_ALL_READ]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
