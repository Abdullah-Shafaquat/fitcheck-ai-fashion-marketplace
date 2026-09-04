import prisma from "@/lib/prisma";
import { normalizeOrderStatus } from "@/lib/orderWorkflow";
import { getDefaultCommissionRate, getReturnWindowDays, round2 } from "@/lib/sellerSettings";
import { logSellerAudit } from "@/lib/sellerAudit";

/**
 * Financial engine for the multi-vendor marketplace.
 *
 * Earnings lifecycle (safe defaults):
 *   Order Delivered  -> seller CREDIT -> pendingBalance (return window)
 *   Window elapsed   -> pendingBalance -> availableBalance (eligible for payout)
 *   Order Refunded   -> reversal (debit) affecting pending/available
 *   Order Cancelled  -> reversal (credit removed)
 *
 * All operations are idempotent and run inside transactions.
 */

/**
 * Determine the per-order-item commission rate for a seller.
 */
export async function resolveCommissionRate(sellerId: string, fallbackGlobal?: number): Promise<number> {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { commissionRate: true },
  });
  if (seller?.commissionRate != null) return round2(seller.commissionRate);
  return round2(fallbackGlobal ?? (await getDefaultCommissionRate()));
}

/**
 * Idempotently credit a seller's earnings for a delivered order. Only credits
 * once per (orderNo, kind=CREDIT).
 */
export async function applyEarningsForDeliveredOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if (normalizeOrderStatus(order.status) !== "Delivered") return;

  const items = Array.isArray(order.items) ? order.items : [];
  const sellerIds = [
    ...new Set(items.map((it: any) => it?.ownerSellerId).filter(Boolean)),
  ] as string[];
  if (!sellerIds.length) return;

  const globalDefault = await getDefaultCommissionRate();
  const returnWindowMs = (await getReturnWindowDays()) * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const sellerId of sellerIds) {
    // Idempotency guard
    const existing = await prisma.sellerEarning.findFirst({
      where: { sellerId, orderNo: order.orderNo, kind: "CREDIT" },
    });
    if (existing) continue;

    const sellerIts = items.filter((it: any) => String(it?.ownerSellerId) === String(sellerId));
    const gross = sellerIts.reduce((s: number, it: any) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
    if (gross <= 0) continue;

    const rate = await resolveCommissionRate(sellerId, globalDefault);
    const commission = round2((gross * rate) / 100);
    const net = round2(gross - commission);

    await prisma.$transaction(async (tx) => {
      const p = await tx.sellerProfile.findUnique({ where: { id: sellerId } });
      if (!p) return;
      const deliveredAt = order.lastStatusChangeAt?.getTime() ?? Date.now();
      const eligible = now - deliveredAt >= returnWindowMs;
      const newPending = round2(p.pendingBalance + (eligible ? 0 : net));
      const newAvailable = round2(p.availableBalance + (eligible ? net : 0));
      await tx.sellerProfile.update({
        where: { id: sellerId },
        data: {
          pendingBalance: newPending,
          availableBalance: newAvailable,
          totalEarnings: round2(p.totalEarnings + net),
        },
      });
      await tx.sellerEarning.create({
        data: {
          sellerId,
          kind: "CREDIT",
          orderNo: order.orderNo,
          productName: sellerIts.map((it: any) => it.name).filter(Boolean).join(", "),
          gross: round2(gross),
          commission: round2(commission),
          commissionRate: rate,
          net: round2(net),
          balanceAfter: round2(newPending + newAvailable),
          note: "Order delivered",
        },
      });
    });
  }
}

/**
 * Idempotently reverse earnings for a cancelled or refunded order (removes the
 * CREDIT impact). Debits remain non-negative and never go below zero.
 */
export async function reverseEarningsForOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const normalized = normalizeOrderStatus(order.status);
  if (normalized !== "Cancelled" && normalized !== "Refunded") return;

  const items = Array.isArray(order.items) ? order.items : [];
  const sellerIds = [
    ...new Set(items.map((it: any) => it?.ownerSellerId).filter(Boolean)),
  ] as string[];
  for (const sellerId of sellerIds) {
    const credit = await prisma.sellerEarning.findFirst({
      where: { sellerId, orderNo: order.orderNo, kind: "CREDIT" },
    });
    if (!credit) continue;

    // Idempotency: only reverse once per order per seller
    const reversed = await prisma.sellerEarning.findFirst({
      where: { sellerId, orderNo: order.orderNo, kind: normalized === "Refunded" ? "REFUND_DEDUCT" : "CANCELLATION_ADJUST" },
    });
    if (reversed) continue;

    const net = credit.net;
    await prisma.$transaction(async (tx) => {
      const p = await tx.sellerProfile.findUnique({ where: { id: sellerId } });
      if (!p) return;
      // Prefer deducting from available, then pending.
      const fromAvailable = Math.min(p.availableBalance, net);
      const remaining = round2(net - fromAvailable);
      const fromPending = Math.min(p.pendingBalance, remaining);
      await tx.sellerProfile.update({
        where: { id: sellerId },
        data: {
          availableBalance: round2(p.availableBalance - fromAvailable),
          pendingBalance: round2(p.pendingBalance - fromPending),
          totalEarnings: round2(Math.max(0, p.totalEarnings - net)),
        },
      });
      await tx.sellerEarning.create({
        data: {
          sellerId,
          kind: normalized === "Refunded" ? "REFUND_DEDUCT" : "CANCELLATION_ADJUST",
          orderNo: order.orderNo,
          productName: credit.productName,
          gross: round2(-credit.gross),
          commission: round2(-credit.commission),
          net: round2(-net),
          balanceAfter: round2(p.availableBalance - fromAvailable + p.pendingBalance - fromPending),
          note: normalized === "Refunded" ? "Order refunded - earnings reversed" : "Order cancelled - earnings reversed",
        },
      });
    });
  }
}

/**
 * Move eligible pending earnings (delivered orders past the return window) into
 * available balance. Safe to run on payout request / dashboard load.
 */
export async function reconcilePendingToAvailable(sellerId: string) {
  const returnWindowMs = (await getReturnWindowDays()) * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const credits = await prisma.sellerEarning.findMany({
    where: { sellerId, kind: "CREDIT" },
    orderBy: { createdAt: "asc" },
  });
  if (!credits.length) return 0;

  // Batch the previously per-credit read lookups into a handful of queries so we
  // do not perform N read round-trips for N credits. Financial behavior is
  // preserved exactly: idempotency (AVAILABLE_TRANSFER existence), order-state
  // checks (Cancelled/Refunded + return-window elapsed) happen the same way, and
  // the balance move itself remains a guarded, atomic transaction per credit.
  const notes = credits.map((c) => `order:${c.id}`);
  const [transferRows, orderNos] = await Promise.all([
    prisma.sellerEarning.findMany({
      where: { sellerId, kind: "AVAILABLE_TRANSFER", note: { in: notes } },
      select: { note: true },
    }),
    Promise.resolve([...new Set(credits.map((c) => c.orderNo).filter(Boolean))] as string[]),
  ]);
  const alreadyMoved = new Set(transferRows.map((t) => t.note));

  const ordersByNo = new Map<string, { status: string; lastStatusChangeAt: Date | null; createdAt: Date }>();
  if (orderNos.length) {
    const orders = await prisma.order.findMany({
      where: { orderNo: { in: orderNos } },
      select: { orderNo: true, status: true, lastStatusChangeAt: true, createdAt: true },
    });
    for (const o of orders) ordersByNo.set(o.orderNo, o);
  }

  let totalMoved = 0;
  for (const c of credits) {
    if (alreadyMoved.has(`order:${c.id}`)) continue;
    if (c.net <= 0) continue;

    const order = c.orderNo ? ordersByNo.get(c.orderNo) : undefined;
    if (order) {
      const status = normalizeOrderStatus(order.status);
      if (status === "Cancelled" || status === "Refunded") continue;
    }
    const elapsed = order ? now - new Date(order.lastStatusChangeAt ?? order.createdAt).getTime() : 0;
    if (elapsed < returnWindowMs) continue;

    // Atomic, idempotent move: re-read the live pending balance inside the
    // transaction and clamp, matching the original clamps exactly.
    const moved = await prisma.$transaction(async (tx) => {
      const p = await tx.sellerProfile.findUnique({ where: { id: sellerId } });
      if (!p) return 0;
      const actualMove = Math.min(c.net, p.pendingBalance);
      if (actualMove <= 0) return 0;
      await tx.sellerProfile.update({
        where: { id: sellerId },
        data: {
          pendingBalance: round2(p.pendingBalance - actualMove),
          availableBalance: round2(p.availableBalance + actualMove),
        },
      });
      await tx.sellerEarning.create({
        data: {
          sellerId,
          kind: "AVAILABLE_TRANSFER",
          orderNo: c.orderNo,
          gross: 0,
          commission: 0,
          net: round2(actualMove),
          balanceAfter: round2(p.availableBalance + actualMove),
          note: `order:${c.id}`,
        },
      });
      return actualMove;
    });
    totalMoved += moved;
  }
  return totalMoved;
}

/**
 * Request a payout. Validates balance, min amount, and no duplicate concurrent
 * payout. Uses a transaction to atomically lock the amount into "in transit"
 * (decrements available balance; restored on rejection/failure).
 */
export async function requestPayout(input: {
  sellerId: string;
  amount: number;
  method: string;
  accountDetails?: Record<string, string>;
}): Promise<{ ok: true; payout: any } | { ok: false; error: string }> {
  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Invalid payout amount." };
  }
  const min = await (await import("@/lib/sellerSettings")).getPayoutMinAmount();
  if (amount < min) {
    return { ok: false, error: `Minimum payout amount is Rs ${min.toLocaleString()}.` };
  }

  const payout = await prisma.$transaction(async (tx) => {
    const seller = await tx.sellerProfile.findUnique({ where: { id: input.sellerId } });
    if (!seller) throw new Error("seller_not_found");
    if (seller.approvalStatus !== "APPROVED") throw new Error("seller_not_active");
    if (seller.availableBalance < amount) {
      throw new Error("insufficient_balance");
    }
    const pending = await tx.sellerPayout.findFirst({
      where: { sellerId: input.sellerId, status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } },
    });
    if (pending) throw new Error("duplicate_payout");

    const payout = await tx.sellerPayout.create({
      data: {
        sellerId: input.sellerId,
        amount,
        method: String(input.method || "bank").slice(0, 40),
        accountDetails: input.accountDetails || {},
        status: "PENDING",
        requestedAt: new Date(),
      },
    });
    await tx.sellerProfile.update({
      where: { id: input.sellerId },
      data: { availableBalance: round2(seller.availableBalance - amount) },
    });
    return payout;
  }).catch((e: any) => e);

  if (payout instanceof Error) {
    const msg =
      payout.message === "insufficient_balance"
        ? "Requested amount exceeds your available balance."
        : payout.message === "duplicate_payout"
          ? "You already have a pending payout request."
          : payout.message === "seller_not_active"
            ? "Your seller account is not active."
            : "Payout request failed. Please try again.";
    return { ok: false, error: msg };
  }

  await logSellerAudit({
    sellerId: input.sellerId,
    action: "PAYOUT_REQUESTED",
    performedBy: input.sellerId,
    target: payout.id,
    details: { amount },
  });
  return { ok: true, payout };
}

export async function listSellerPayouts(sellerId: string) {
  return prisma.sellerPayout.findMany({
    where: { sellerId },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });
}

export async function getSellerEarningsStatements(sellerId: string) {
  return prisma.sellerEarning.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
