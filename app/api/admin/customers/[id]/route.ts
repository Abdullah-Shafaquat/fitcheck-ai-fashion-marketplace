import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getCustomerDetail } from "@/lib/customerAdmin";
import prisma from "@/lib/prisma";
import {
  normalizeEmail,
  isValidEmail,
} from "@/lib/customerAccount";
import { logCustomerAudit } from "@/lib/customerAudit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const customer = await getCustomerDetail(decodeURIComponent(id));
    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  let body: {
    name?: string;
    email?: string;
    phone?: string;
    adminNotes?: string;
    accountStatus?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (id.startsWith("guest:")) {
    return NextResponse.json(
      { error: "Guest customers without an account cannot be edited. Block the email instead." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
    }
    data.name = name;
  }

  if (body.phone !== undefined) {
    data.phone = String(body.phone).trim() || null;
  }

  if (body.adminNotes !== undefined) {
    data.adminNotes = String(body.adminNotes).trim() || null;
  }

  if (body.email !== undefined) {
    const newEmail = normalizeEmail(body.email);
    if (!isValidEmail(newEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (newEmail !== user.email) {
      const taken = await prisma.user.findUnique({ where: { email: newEmail } });
      if (taken) {
        return NextResponse.json({ error: "Email is already in use." }, { status: 409 });
      }
      const blocked = await prisma.blockedEmail.findFirst({
        where: { email: newEmail, isActive: true },
      });
      if (blocked) {
        return NextResponse.json(
          { error: "This email is on the blocked list and cannot be assigned." },
          { status: 409 }
        );
      }
      data.email = newEmail;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
  });

  await logCustomerAudit({
    action: "CUSTOMER_UPDATED",
    targetEmail: updated.email,
    targetUserId: updated.id,
    details: { fields: Object.keys(data) },
  });

  const customer = await getCustomerDetail(updated.id);
  return NextResponse.json({ customer });
}
