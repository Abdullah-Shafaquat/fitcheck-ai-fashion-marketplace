import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { reviewVerificationItem, VERIFICATION_STATES_PUBLIC } from "@/lib/sellerVerification";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (admin) return admin;
  const { id: sellerId } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const item = String(body.item || "");
  if (!["cnic", "images", "video"].includes(item)) {
    return NextResponse.json({ error: "Invalid verification item." }, { status: 400 });
  }

  const action = String(body.action || "");
  if (!VERIFICATION_STATES_PUBLIC.includes(action)) {
    return NextResponse.json({ error: "Invalid verification action." }, { status: 400 });
  }

  const result = await reviewVerificationItem({
    sellerId,
    item: item as "cnic" | "images" | "video",
    action: action as "PENDING" | "VERIFIED" | "REJECTED" | "RESUBMISSION_REQUESTED",
    reason: body.reason ? String(body.reason) : undefined,
    performedBy: "admin",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
