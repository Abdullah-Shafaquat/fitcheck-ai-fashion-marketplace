import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";
import { isValidPhone } from "@/lib/customerAccount";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if (auth.response) return auth.response;
    const user = auth.user;
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        provider: user.provider,
        accountStatus: user.accountStatus,
      },
    });
  } catch (error) {
    console.error("[ACCOUNT_PROFILE_GET]", error);
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if (auth.response) return auth.response;
    const user = auth.user;

    const body = await req.json();
    const name = body.name === undefined ? undefined : String(body.name || "").trim();
    const phone = body.phone === undefined ? undefined : String(body.phone || "").trim();

    const data: { name?: string; phone?: string | null } = {};
    if (name !== undefined) {
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
      }
      if (name.length > 80) {
        return NextResponse.json({ error: "Name is too long." }, { status: 400 });
      }
      data.name = name;
    }
    if (phone !== undefined) {
      if (phone && !isValidPhone(phone)) {
        return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
      }
      data.phone = phone || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data });

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        image: updated.image,
        provider: updated.provider,
        accountStatus: updated.accountStatus,
      },
    });
  } catch (error) {
    console.error("[ACCOUNT_PROFILE_PATCH]", error);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
