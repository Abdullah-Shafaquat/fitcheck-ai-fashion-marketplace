import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import prisma from "@/lib/prisma";
import { listSellerPayouts, requestPayout, reconcilePendingToAvailable } from "@/lib/sellerEarnings";
import { getPayoutMinAmount } from "@/lib/sellerSettings";

export async function GET(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  await reconcilePendingToAvailable(auth.seller.id);
  const seller = await prisma.sellerProfile.findUnique({ where: { id: auth.seller.id } });
  const payouts = await listSellerPayouts(auth.seller.id);
  const min = await getPayoutMinAmount();
  return NextResponse.json({
    payouts: payouts.map((p) => ({ ...p, requestedAt: p.requestedAt.toISOString(), approvedAt: p.approvedAt?.toISOString() ?? null, paidAt: p.paidAt?.toISOString() ?? null })),
    availableBalance: seller?.availableBalance ?? 0,
    pendingBalance: seller?.pendingBalance ?? 0,
    totalPaidOut: seller?.totalPaidOut ?? 0,
    minAmount: min,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const result = await requestPayout({
      sellerId: auth.seller.id,
      amount: Number(body.amount),
      method: String(body.method || "bank"),
      accountDetails: body.accountDetails || {},
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ payout: { ...result.payout, requestedAt: result.payout.requestedAt.toISOString() } }, { status: 201 });
  } catch (error) {
    console.error("[SELLER_PAYOUT_CREATE]", error);
    return NextResponse.json({ error: "Failed to request payout." }, { status: 500 });
  }
}
