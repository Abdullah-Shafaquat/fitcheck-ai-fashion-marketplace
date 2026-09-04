import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { processPayoutAdmin } from "@/lib/sellerAdmin";

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
  if (!["APPROVED", "PROCESSING", "PAID", "REJECTED", "FAILED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const result = await processPayoutAdmin(
    id,
    status as any,
    {
      paymentReference: body.paymentReference ? String(body.paymentReference) : undefined,
      adminNotes: body.adminNotes ? String(body.adminNotes) : undefined,
      rejectionReason: body.rejectionReason ? String(body.rejectionReason) : undefined,
    },
    "admin"
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
