import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const blocked = await prisma.blockedEmail.findMany({
      orderBy: { blockedAt: "desc" },
      take: 200,
    });
    return NextResponse.json({
      blockedEmails: blocked.map((b) => ({
        id: b.id,
        email: b.email,
        reason: b.reason,
        reasonDetails: b.reasonDetails,
        blockedAt: b.blockedAt.toISOString(),
        blockedBy: b.blockedBy,
        unblockedAt: b.unblockedAt?.toISOString() ?? null,
        unblockedBy: b.unblockedBy,
        isActive: b.isActive,
        status: b.isActive ? "Blocked" : "Unblocked",
      })),
    });
  } catch (error) {
    console.error("[BLOCKED_EMAILS]", error);
    return NextResponse.json({ blockedEmails: [] }, { status: 500 });
  }
}
