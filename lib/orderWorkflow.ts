/**
 * Central order lifecycle — single source of truth for status transitions.
 * Legacy statuses (e.g. "Processing" without Pending/Confirmed) are normalized
 * so existing orders keep working.
 */

export const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancel Requested",
  "Cancelled",
  "Refund Requested",
  "Refund Approved",
  "Refunded",
  "Refund Rejected",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Main fulfillment timeline shown to customers */
export const FULFILLMENT_TIMELINE = [
  "Pending",
  "Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
] as const;

const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  "out for delivery": "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  "cancel requested": "Cancel Requested",
  "refund requested": "Refund Requested",
  "refund approved": "Refund Approved",
  refunded: "Refunded",
  "refund rejected": "Refund Rejected",
};

export function normalizeOrderStatus(status: string): OrderStatus {
  const trimmed = String(status || "").trim();
  if (!trimmed) return "Pending";
  const key = trimmed.toLowerCase();
  if (LEGACY_STATUS_MAP[key]) return LEGACY_STATUS_MAP[key];
  const match = ORDER_STATUSES.find((s) => s.toLowerCase() === key);
  return match ?? ("Processing" as OrderStatus);
}

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Confirmed", "Processing", "Cancel Requested", "Cancelled"],
  Confirmed: ["Processing", "Cancel Requested", "Cancelled"],
  Processing: ["Packed", "Cancel Requested", "Cancelled"],
  Packed: ["Shipped", "Cancel Requested"],
  Shipped: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: ["Refund Requested"],
  "Refund Requested": ["Refund Approved", "Refund Rejected"],
  "Refund Approved": ["Refunded"],
  "Refund Rejected": ["Delivered"],
  "Cancel Requested": ["Cancelled"],
  Cancelled: [],
  Refunded: [],
};

export function canTransition(from: string, to: string): boolean {
  const fromNorm = normalizeOrderStatus(from);
  const toNorm = normalizeOrderStatus(to);
  return ALLOWED_TRANSITIONS[fromNorm]?.includes(toNorm) ?? false;
}

export function validNextStatuses(current: string): OrderStatus[] {
  const norm = normalizeOrderStatus(current);
  return ALLOWED_TRANSITIONS[norm] ?? [];
}

export function isTerminalStatus(status: string): boolean {
  const norm = normalizeOrderStatus(status);
  return norm === "Cancelled" || norm === "Refunded";
}

export function canCustomerCancel(status: string): boolean {
  const norm = normalizeOrderStatus(status);
  return ["Pending", "Confirmed", "Processing", "Packed"].includes(norm);
}

export function canRequestRefund(status: string): boolean {
  return normalizeOrderStatus(status) === "Delivered";
}

export const CANCELLATION_REASONS = [
  "Customer changed their mind",
  "Ordered by mistake",
  "Wrong product ordered",
  "Item unavailable",
  "Payment issue",
  "Unable to fulfill the order",
  "Customer requested cancellation",
  "Other",
] as const;

export const REFUND_REASONS = [
  "Damaged product",
  "Wrong item received",
  "Item not as described",
  "Quality issue",
  "Duplicate order",
  "Customer return approved",
  "Order cancelled after payment",
  "Other",
] as const;

export type RefundStatus =
  | "NONE"
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "REFUNDED";

export function getDeliveryEstimateDays(country?: string | null): {
  min: number;
  max: number;
} {
  void country;
  const min = Math.max(1, Number(process.env.DELIVERY_DAYS_MIN) || 4);
  const max = Math.max(min, Number(process.env.DELIVERY_DAYS_MAX) || 6);
  return { min, max };
}

export function computeExpectedDeliveryRange(
  baseDate: Date,
  country?: string | null
): { start: Date; end: Date } {
  const { min, max } = getDeliveryEstimateDays(country);
  const start = new Date(baseDate);
  start.setUTCDate(start.getUTCDate() + min);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(baseDate);
  end.setUTCDate(end.getUTCDate() + max);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

/** @deprecated use computeExpectedDeliveryRange */
export function computeExpectedDelivery(
  createdAt: Date,
  daysToDeliver = 4
): Date {
  const date = new Date(createdAt);
  date.setUTCDate(date.getUTCDate() + daysToDeliver);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

export function formatExpectedDelivery(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined
): string | null {
  if (!start && !end) return null;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (s && e && s.toDateString() !== e.toDateString()) {
    return `${fmt(s)} – ${fmt(e)}`;
  }
  const single = e || s;
  return single ? fmt(single) : null;
}

export function statusDisplayLabel(status: string): string {
  return normalizeOrderStatus(status);
}

export function statusActionLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    Pending: "Mark as Pending",
    Confirmed: "Confirm Order",
    Processing: "Start Processing",
    Packed: "Mark as Packed",
    Shipped: "Mark as Shipped",
    "Out for Delivery": "Mark as Out for Delivery",
    Delivered: "Mark as Delivered",
    "Cancel Requested": "Approve Cancellation",
    Cancelled: "Cancel Order",
    "Refund Requested": "Request Refund",
    "Refund Approved": "Approve Refund",
    Refunded: "Complete Refund",
    "Refund Rejected": "Reject Refund",
  };
  return labels[status] ?? status;
}

export interface StatusHistoryEntry {
  from: string;
  to: string;
  changedBy: string;
  note?: string;
  at: string;
}

export function historyToJson(history: StatusHistoryEntry[]) {
  return JSON.parse(JSON.stringify(history));
}

export function appendHistory(
  currentHistory: unknown,
  entry: Omit<StatusHistoryEntry, "at">
): StatusHistoryEntry[] {
  const history = Array.isArray(currentHistory)
    ? (currentHistory as StatusHistoryEntry[])
    : [];
  return [...history, { ...entry, at: new Date().toISOString() }];
}

/**
 * Finds the status an order had immediately before a given status was entered
 * (e.g. the origin of a "Cancel Requested" state when approving or rejecting it).
 */
export function getStatusBefore(
  currentHistory: unknown,
  targetStatus: string
): OrderStatus | null {
  const history = Array.isArray(currentHistory)
    ? (currentHistory as StatusHistoryEntry[])
    : [];
  const target = normalizeOrderStatus(targetStatus);
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (normalizeOrderStatus(entry.to) === target) {
      return normalizeOrderStatus(entry.from);
    }
  }
  return null;
}

export interface AddressSnapshot {
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  area?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
}

export function parseAddressSnapshot(raw: unknown): AddressSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!o.line1 && !o.fullName) return null;
  return {
    label: String(o.label || "Home"),
    fullName: String(o.fullName || ""),
    phone: String(o.phone || ""),
    line1: String(o.line1 || ""),
    line2: o.line2 ? String(o.line2) : undefined,
    area: o.area ? String(o.area) : undefined,
    city: String(o.city || ""),
    province: o.province ? String(o.province) : undefined,
    postalCode: o.postalCode ? String(o.postalCode) : undefined,
    country: String(o.country || "Pakistan"),
  };
}

export function formatAddressLines(
  snapshot: AddressSnapshot | null,
  fallback?: { address?: string; city?: string; zip?: string; country?: string; customer?: string; phone?: string }
): string[] {
  if (snapshot) {
    const lines: string[] = [];
    if (snapshot.fullName) lines.push(snapshot.fullName);
    if (snapshot.phone) lines.push(snapshot.phone);
    const street = [snapshot.line1, snapshot.line2].filter(Boolean).join(", ");
    if (street) lines.push(street);
    const locality = [snapshot.area, snapshot.city, snapshot.province]
      .filter(Boolean)
      .join(", ");
    if (locality) lines.push(locality);
    if (snapshot.postalCode) lines.push(snapshot.postalCode);
    if (snapshot.country) lines.push(snapshot.country);
    return lines;
  }
  if (fallback) {
    const lines: string[] = [];
    if (fallback.customer) lines.push(fallback.customer);
    if (fallback.phone) lines.push(fallback.phone);
    if (fallback.address) lines.push(fallback.address);
    const cityLine = [fallback.city, fallback.zip, fallback.country].filter(Boolean).join(", ");
    if (cityLine) lines.push(cityLine);
    return lines;
  }
  return [];
}
