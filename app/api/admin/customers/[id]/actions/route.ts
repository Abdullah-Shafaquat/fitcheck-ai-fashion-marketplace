import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  normalizeEmail,
  BLOCK_REASONS,
  createPasswordResetToken,
} from "@/lib/customerAccount";
import { logCustomerAudit } from "@/lib/customerAudit";
import { notifyCustomer } from "@/lib/notify";
import { getCustomerDetail, resolveCustomerId } from "@/lib/customerAdmin";

type ActionBody = {
  action?:
    | "activate"
    | "deactivate"
    | "suspend"
    | "block"
    | "unblock"
    | "delete"
    | "send-password-reset"
    | "force-password-reset";
  reason?: string;
  reasonDetails?: string;
};

async function upsertBlockedEmail(
  email: string,
  reason: string,
  reasonDetails: string | null,
  userId: string | null
) {
  const normalized = normalizeEmail(email);
  await prisma.blockedEmail.upsert({
    where: { email: normalized },
    create: {
      email: normalized,
      reason,
      reasonDetails,
      blockedBy: "admin",
      isActive: true,
      userId,
    },
    update: {
      reason,
      reasonDetails,
      blockedBy: "admin",
      blockedAt: new Date(),
      isActive: true,
      unblockedAt: null,
      unblockedBy: null,
      userId,
    },
  });
}

async function deactivateBlockedEmail(email: string) {
  const normalized = normalizeEmail(email);
  await prisma.blockedEmail.updateMany({
    where: { email: normalized, isActive: true },
    data: { isActive: false, unblockedAt: new Date(), unblockedBy: "admin" },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  let body: ActionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = body.action;
  if (!action) {
    return NextResponse.json({ error: "Action is required." }, { status: 400 });
  }

  try {
    const { userId, email } = await resolveCustomerId(id);
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findUnique({ where: { email } });

    if (action === "block") {
      const reason = String(body.reason || "").trim();
      if (!BLOCK_REASONS.includes(reason as (typeof BLOCK_REASONS)[number])) {
        return NextResponse.json({ error: "A valid block reason is required." }, { status: 400 });
      }
      const details = String(body.reasonDetails || "").trim() || null;
      if (reason === "Other" && !details) {
        return NextResponse.json({ error: "Please provide block details." }, { status: 400 });
      }

      await upsertBlockedEmail(email, reason, details, user?.id ?? null);

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            accountStatus: "BLOCKED",
            blockedAt: new Date(),
            blockedBy: "admin",
            blockReason: reason,
            blockReasonDetails: details,
          },
        });
      }

      await logCustomerAudit({
        action: "CUSTOMER_BLOCKED",
        targetEmail: email,
        targetUserId: user?.id,
        details: { reason, details },
      });
      await logCustomerAudit({
        action: "BLOCKED_EMAIL_ADDED",
        targetEmail: email,
        targetUserId: user?.id,
        details: { reason },
      });

      await notifyCustomer(email, {
        type: "account",
        title: "Account Blocked",
        message:
          "Your account has been blocked. Please contact support if you believe this is an error.",
        link: "/contact",
      });

      const customer = await getCustomerDetail(user?.id ?? `guest:${email}`);
      return NextResponse.json({ customer });
    }

    if (action === "unblock") {
      await deactivateBlockedEmail(email);

      if (user && user.accountStatus === "BLOCKED") {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            accountStatus: "ACTIVE",
            blockedAt: null,
            blockedBy: null,
            blockReason: null,
            blockReasonDetails: null,
          },
        });
      }

      await logCustomerAudit({
        action: "CUSTOMER_UNBLOCKED",
        targetEmail: email,
        targetUserId: user?.id,
      });
      await logCustomerAudit({
        action: "BLOCKED_EMAIL_REMOVED",
        targetEmail: email,
        targetUserId: user?.id,
      });

      if (user) {
        await notifyCustomer(email, {
          type: "account",
          title: "Account Reactivated",
          message: "Your account access has been restored. You may sign in again.",
          link: "/login",
        });
      }

      const customer = await getCustomerDetail(user?.id ?? `guest:${email}`);
      return NextResponse.json({ customer });
    }

    if (!user) {
      return NextResponse.json(
        { error: "This action requires a registered account." },
        { status: 400 }
      );
    }

    if (action === "activate") {
      await prisma.user.update({
        where: { id: user.id },
        data: { accountStatus: "ACTIVE", deletedAt: null },
      });
      await logCustomerAudit({ action: "CUSTOMER_ACTIVATED", targetEmail: email, targetUserId: user.id });
      await notifyCustomer(email, {
        type: "account",
        title: "Account Activated",
        message: "Your account has been activated.",
        link: "/account",
      });
    } else if (action === "deactivate") {
      await prisma.user.update({
        where: { id: user.id },
        data: { accountStatus: "INACTIVE" },
      });
      await logCustomerAudit({ action: "CUSTOMER_DEACTIVATED", targetEmail: email, targetUserId: user.id });
      await notifyCustomer(email, {
        type: "account",
        title: "Account Deactivated",
        message: "Your account has been deactivated. Contact support to reactivate.",
        link: "/contact",
      });
    } else if (action === "suspend") {
      await prisma.user.update({
        where: { id: user.id },
        data: { accountStatus: "SUSPENDED" },
      });
      await logCustomerAudit({ action: "CUSTOMER_SUSPENDED", targetEmail: email, targetUserId: user.id });
      await notifyCustomer(email, {
        type: "account",
        title: "Account Suspended",
        message: "Your account has been suspended. Please contact support.",
        link: "/contact",
      });
    } else if (action === "delete") {
      await prisma.user.update({
        where: { id: user.id },
        data: { accountStatus: "DELETED", deletedAt: new Date() },
      });
      await upsertBlockedEmail(
        email,
        "Account deleted by admin",
        null,
        user.id
      );
      await logCustomerAudit({ action: "CUSTOMER_DELETED", targetEmail: email, targetUserId: user.id });
    } else if (action === "send-password-reset") {
      const { token, expiresAt } = await createPasswordResetToken(user.id, "admin");
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetLink = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

      await logCustomerAudit({
        action: "PASSWORD_RESET_INITIATED",
        targetEmail: email,
        targetUserId: user.id,
        details: { expiresAt: expiresAt.toISOString() },
      });

      await notifyCustomer(email, {
        type: "security",
        title: "Password Reset Requested",
        message:
          "An administrator initiated a password reset for your account. Use the secure link provided to set a new password.",
        link: `/reset-password?token=${token}`,
      });

      const customer = await getCustomerDetail(user.id);
      return NextResponse.json({
        customer,
        resetLink,
        expiresAt: expiresAt.toISOString(),
        message: "Password reset link generated. Share securely with the customer — the password is never exposed.",
      });
    } else if (action === "force-password-reset") {
      await prisma.user.update({
        where: { id: user.id },
        data: { forcePasswordReset: true },
      });
      await logCustomerAudit({
        action: "FORCE_PASSWORD_RESET",
        targetEmail: email,
        targetUserId: user.id,
      });
      await notifyCustomer(email, {
        type: "security",
        title: "Password Reset Required",
        message: "You must create a new password on your next sign-in.",
        link: "/login",
      });
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const customer = await getCustomerDetail(user.id);
    return NextResponse.json({ customer });
  } catch (error) {
    console.error("[CUSTOMER_ACTION]", error);
    return NextResponse.json({ error: "Failed to process action." }, { status: 500 });
  }
}
