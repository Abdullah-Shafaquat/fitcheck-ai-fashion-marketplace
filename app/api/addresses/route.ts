import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";
import { isValidPhone } from "@/lib/customerAccount";

type AddressInput = {
  label?: string;
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  area?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
};

function cleanInput(body: Record<string, unknown>) {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    label: s(body.label) || "Home",
    fullName: s(body.fullName),
    phone: s(body.phone),
    line1: s(body.line1),
    line2: s(body.line2) || undefined,
    area: s(body.area) || undefined,
    city: s(body.city),
    province: s(body.province) || undefined,
    postalCode: s(body.postalCode) || undefined,
    country: s(body.country) || "Pakistan",
    isDefault: body.isDefault === true,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireCustomer(req);
  if (auth.response) return auth.response;
  const email = auth.user.email as string;
  try {
    const addresses = await prisma.userAddress.findMany({
      where: { email },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json({ error: "Failed to fetch addresses", addresses: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireCustomer(req);
  if (auth.response) return auth.response;
  const email = auth.user.email as string;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const input = cleanInput(body);
  if (!input.fullName || !input.phone || !input.line1 || !input.city) {
    return NextResponse.json(
      { error: "Full name, phone, address and city are required." },
      { status: 400 }
    );
  }
  if (!isValidPhone(input.phone)) {
    return NextResponse.json(
      { error: "A valid phone number is required." },
      { status: 400 }
    );
  }

  try {
    const count = await prisma.userAddress.count({ where: { email } });
    const makeDefault = count === 0 || input.isDefault;
    const address = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.userAddress.updateMany({
          where: { email, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.userAddress.create({
        data: {
          email,
          label: input.label,
          fullName: input.fullName,
          phone: input.phone,
          line1: input.line1,
          line2: input.line2 ?? null,
          area: input.area ?? null,
          city: input.city,
          province: input.province ?? null,
          postalCode: input.postalCode ?? null,
          country: input.country,
          isDefault: makeDefault,
        },
      });
    });
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json({ error: "Failed to save address" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireCustomer(req);
  if (auth.response) return auth.response;
  const email = auth.user.email as string;

  let id: string;
  let body: Record<string, unknown>;
  try {
    const url = new URL(req.url);
    id = url.searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json({ error: "Address id is required" }, { status: 400 });
    }
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const existing = await prisma.userAddress.findFirst({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    // Ownership check: address must belong to the email acting as identity.
    if (existing.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const willBeDefault = body.isDefault === true;

    // PATCH is partial: only validate fields actually provided. A set-default
    // call may send `{ isDefault: true }` with no other fields.
    const cleanPatch = cleanInput(body);
    if (cleanPatch.phone && !isValidPhone(cleanPatch.phone)) {
      return NextResponse.json(
        { error: "A valid phone number is required." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (willBeDefault && !existing.isDefault) {
        await tx.userAddress.updateMany({
          where: { email, isDefault: true },
          data: { isDefault: false },
        });
      }
      const patch = cleanPatch;
      // Always allow taking a default into account even when only editing fields.
      const data: AddressInput = { ...patch, isDefault: willBeDefault || existing.isDefault };
      return tx.userAddress.update({ where: { id }, data });
    });
    return NextResponse.json({ address: updated });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireCustomer(req);
  if (auth.response) return auth.response;
  const email = auth.user.email as string;
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) {
    return NextResponse.json({ error: "Address id is required" }, { status: 400 });
  }
  try {
    const existing = await prisma.userAddress.findFirst({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    if (existing.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const wasDefault = existing.isDefault;
    await prisma.userAddress.delete({ where: { id } });

    // If we deleted the default, promote the most recent remaining address.
    if (wasDefault) {
      const next = await prisma.userAddress.findFirst({
        where: { email },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await prisma.userAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 });
  }
}
