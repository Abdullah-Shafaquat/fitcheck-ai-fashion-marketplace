import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getMarketplaceSetting,
  setMarketplaceSetting,
  DEFAULT_COMMISSION_RATE,
  DEFAULT_PAYOUT_MIN,
  RETURN_WINDOW_DAYS,
} from "@/lib/sellerSettings";

const SETTING_DEFAULTS: Record<string, string> = {
  default_commission_rate: String(DEFAULT_COMMISSION_RATE),
  auto_approve_products: "false",
  auto_approve_sellers: "false",
  return_window_days: String(RETURN_WINDOW_DAYS),
  payout_min_amount: String(DEFAULT_PAYOUT_MIN),
};

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin) return admin;
  const settings: Record<string, string> = {};
  for (const key of Object.keys(SETTING_DEFAULTS)) {
    settings[key] = (await getMarketplaceSetting(key)) ?? SETTING_DEFAULTS[key];
  }
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin) return admin;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const settings = body.settings || {};
  for (const key of Object.keys(SETTING_DEFAULTS)) {
    if (settings[key] !== undefined) {
      await setMarketplaceSetting(key, String(settings[key]));
    }
  }
  return NextResponse.json({ ok: true });
}
