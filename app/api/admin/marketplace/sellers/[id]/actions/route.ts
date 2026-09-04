import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { setSellerStatus } from "@/lib/sellerAdmin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (admin) return admin;
  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const status = String(body.status || "");
  if (!["APPROVED", "REJECTED", "UNDER_REVIEW", "SUSPENDED", "BLOCKED", "INACTIVE", "ACTIVE"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const result = await setSellerStatus({
    sellerId: id,
    status,
    reason: body.reason ? String(body.reason) : undefined,
    reasonDetails: body.reasonDetails ? String(body.reasonDetails) : undefined,
    performedBy: "admin",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
