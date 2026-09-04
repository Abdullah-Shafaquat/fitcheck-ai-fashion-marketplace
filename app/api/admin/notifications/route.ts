import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const userId = url.searchParams.get("userId");

  try {
    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    } else {
      where.userId = null;
    }

    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return NextResponse.json({ notifications: [] }, { status: 500 });
  }
}
