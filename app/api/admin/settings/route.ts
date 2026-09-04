import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getAdminSettings,
  saveAdminSettings,
  serializeSettings,
} from "@/lib/adminSettings";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const settings = await getAdminSettings();
    return NextResponse.json({ settings: serializeSettings(settings) });
  } catch (error) {
    console.error("Failed to load admin settings:", error);
    return NextResponse.json(
      { error: "Failed to load settings." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    const settings = await saveAdminSettings(body);
    return NextResponse.json({ settings: serializeSettings(settings) });
  } catch (error) {
    console.error("Failed to save admin settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings." },
      { status: 500 }
    );
  }
}
