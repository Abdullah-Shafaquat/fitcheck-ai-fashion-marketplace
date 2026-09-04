import prisma from "@/lib/prisma";
import { round2 } from "@/lib/sellerSettings";

/**
 * Server-backed administration settings.
 *
 * These are stored in the MarketplaceSetting table (admin-only writes) and are
 * the single source of truth for the /admin/settings UI. The frontend is never
 * the source of truth — nothing critical is decided by localStorage.
 *
 * Safe defaults are used whenever a value is missing or invalid, and numeric
 * inputs are clamped so invalid/negative/unsafe values can never be persisted.
 *
 * NOTE ON EFFECTS: not every represented setting has a server-side effect today.
 *  - active effects: freeShippingThreshold / standardShipping / expressShipping
 *    (shipping cost), lowStockThreshold (low-stock reporting helper).
 *  - persisted, no computed effect yet (documented, not pretended): storeName,
 *    storeEmail, storePhone, storeAddress, currency, taxRate, productsPerPage,
 *    maintenanceMode, notification toggles.
 */

export interface AdminSettings {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  currency: string;
  taxRate: number;
  freeShippingThreshold: number;
  standardShipping: number;
  expressShipping: number;
  lowStockThreshold: number;
  productsPerPage: number;
  maintenanceMode: boolean;
  notifyNewOrders: boolean;
  notifyLowStock: boolean;
  notifyWeeklyReports: boolean;
  notifyNewCustomers: boolean;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  storeName: "FitCheck",
  storeEmail: "support@fitcheck.pk",
  storePhone: "+92 300 1234567",
  storeAddress: "Karachi, Pakistan",
  currency: "PKR",
  taxRate: 8,
  freeShippingThreshold: 5000,
  standardShipping: 250,
  expressShipping: 500,
  lowStockThreshold: 10,
  productsPerPage: 12,
  maintenanceMode: false,
  notifyNewOrders: true,
  notifyLowStock: true,
  notifyWeeklyReports: false,
  notifyNewCustomers: true,
};

const KEY_PREFIX = "admin.";

type Primitive = string | number | boolean;

function keyOf(k: keyof AdminSettings): string {
  return `${KEY_PREFIX}${k}`;
}

function toNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, round2(n)));
}

/**
 * Validate and normalize an arbitrary input into a safe AdminSettings object.
 * Unknown keys are dropped; numeric values are clamped; booleans coerced.
 */
export function sanitizeAdminSettings(raw: Record<string, unknown>): AdminSettings {
  const d = DEFAULT_ADMIN_SETTINGS;
  return {
    storeName: typeof raw.storeName === "string" && raw.storeName.trim()
      ? raw.storeName.trim().slice(0, 120)
      : d.storeName,
    storeEmail: typeof raw.storeEmail === "string" && raw.storeEmail.trim()
      ? raw.storeEmail.trim().slice(0, 160)
      : d.storeEmail,
    storePhone: typeof raw.storePhone === "string" ? raw.storePhone.slice(0, 40) : d.storePhone,
    storeAddress: typeof raw.storeAddress === "string" ? raw.storeAddress.slice(0, 200) : d.storeAddress,
    currency: typeof raw.currency === "string" && ["PKR", "USD", "EUR", "GBP"].includes(raw.currency)
      ? raw.currency
      : d.currency,
    taxRate: toNumber(raw.taxRate, d.taxRate, 0, 100),
    freeShippingThreshold: toNumber(raw.freeShippingThreshold, d.freeShippingThreshold, 0, 100000000),
    standardShipping: toNumber(raw.standardShipping, d.standardShipping, 0, 1000000),
    expressShipping: toNumber(raw.expressShipping, d.expressShipping, 0, 1000000),
    lowStockThreshold: toNumber(raw.lowStockThreshold, d.lowStockThreshold, 1, 10000),
    productsPerPage: toNumber(raw.productsPerPage, d.productsPerPage, 1, 100),
    maintenanceMode: typeof raw.maintenanceMode === "boolean" ? raw.maintenanceMode : d.maintenanceMode,
    notifyNewOrders: typeof raw.notifyNewOrders === "boolean" ? raw.notifyNewOrders : d.notifyNewOrders,
    notifyLowStock: typeof raw.notifyLowStock === "boolean" ? raw.notifyLowStock : d.notifyLowStock,
    notifyWeeklyReports: typeof raw.notifyWeeklyReports === "boolean" ? raw.notifyWeeklyReports : d.notifyWeeklyReports,
    notifyNewCustomers: typeof raw.notifyNewCustomers === "boolean" ? raw.notifyNewCustomers : d.notifyNewCustomers,
  };
}

export function serializeSettings(s: AdminSettings): Record<string, Primitive> {
  return { ...s };
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const rows = await prisma.marketplaceSetting.findMany({
    where: { key: { startsWith: KEY_PREFIX } },
    select: { key: true, value: true },
  });
  if (!rows.length) return DEFAULT_ADMIN_SETTINGS;

  const raw: Record<string, unknown> = {};
  for (const r of rows) {
    const k = r.key.slice(KEY_PREFIX.length) as keyof AdminSettings;
    const d = DEFAULT_ADMIN_SETTINGS[k];
    if (typeof d === "boolean") {
      raw[k] = r.value === "true" ? true : r.value === "false" ? false : r.value;
    } else if (typeof d === "number") {
      raw[k] = Number(r.value);
    } else {
      raw[k] = r.value;
    }
  }
  return sanitizeAdminSettings(raw);
}

export async function saveAdminSettings(input: Record<string, unknown>): Promise<AdminSettings> {
  const settings = sanitizeAdminSettings(input);
  await prisma.$transaction(
    (Object.keys(settings) as (keyof AdminSettings)[]).map((k) =>
      prisma.marketplaceSetting.upsert({
        where: { key: keyOf(k) },
        create: { key: keyOf(k), value: String(settings[k]) },
        update: { value: String(settings[k]) },
      })
    )
  );
  return settings;
}
