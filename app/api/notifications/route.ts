import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";

export async function GET(req: NextRequest) {
  const auth = await requireCustomer(req);
  if (auth.response) return auth.response;
  const email = auth.user.email as string;
  const unreadOnly = new URL(req.url).searchParams.get("unread") === "true";

  try {
    const where: Record<string, unknown> = {
      userId: email.trim().toLowerCase(),
    };

    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("[CUSTOMER_NOTIFICATIONS_GET]", error);
    return NextResponse.json({ notifications: [] }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if (auth.response) return auth.response;
    const email = auth.user.email as string;

    await prisma.notification.deleteMany({
      where: {
        userId: email.trim().toLowerCase(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CUSTOMER_NOTIFICATIONS_DELETE]", error);
    return NextResponse.json({ error: "Failed to clear notifications." }, { status: 500 });
  }
}
