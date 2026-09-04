import prisma from "@/lib/prisma";

export const DEFAULT_COMMISSION_RATE = 10;
export const RETURN_WINDOW_DAYS = 14;
export const DEFAULT_PAYOUT_MIN = 1000;

function num(value: string | null | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function getMarketplaceSetting(key: string): Promise<string | null> {
  const rec = await prisma.marketplaceSetting.findUnique({ where: { key } });
  return rec ? rec.value : null;
}

export async function setMarketplaceSetting(key: string, value: string): Promise<void> {
  await prisma.marketplaceSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getDefaultCommissionRate(): Promise<number> {
  const stored = await getMarketplaceSetting("defaultCommissionRate");
  if (stored !== null) return num(stored, DEFAULT_COMMISSION_RATE);
  return num(process.env.MARKETPLACE_COMMISSION_RATE, DEFAULT_COMMISSION_RATE);
}

export async function getAutoApproveProducts(): Promise<boolean> {
  const stored = await getMarketplaceSetting("autoApproveProducts");
  if (stored !== null) return stored === "true";
  return process.env.MARKETPLACE_AUTO_APPROVE_PRODUCTS === "true";
}

export async function getAutoApproveSellers(): Promise<boolean> {
  const stored = await getMarketplaceSetting("autoApproveSellers");
  if (stored !== null) return stored === "true";
  return process.env.MARKETPLACE_AUTO_APPROVE_SELLERS === "true";
}

export async function getReturnWindowDays(): Promise<number> {
  const stored = await getMarketplaceSetting("returnWindowDays");
  if (stored !== null) return num(stored, RETURN_WINDOW_DAYS);
  return RETURN_WINDOW_DAYS;
}

export async function getPayoutMinAmount(): Promise<number> {
  const stored = await getMarketplaceSetting("payoutMinAmount");
  if (stored !== null) return num(stored, DEFAULT_PAYOUT_MIN);
  return DEFAULT_PAYOUT_MIN;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
