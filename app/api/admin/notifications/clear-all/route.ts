import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    await prisma.notification.deleteMany({
      where: { userId: null },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NOTIFICATIONS_CLEAR_ALL]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
