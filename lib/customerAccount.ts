import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";

export const ACCOUNT_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "BLOCKED",
  "DELETED",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const BLOCK_REASONS = [
  "Suspicious activity",
  "Fraud concern",
  "Repeated policy violation",
  "Abusive behavior",
  "Chargeback issue",
  "Duplicate/fake account",
  "Other",
] as const;

export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[0-9()\-\s]{7,20}$/.test(String(phone || "").trim());
}

export async function isEmailBlocked(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const blocked = await prisma.blockedEmail.findFirst({
    where: { email: normalized, isActive: true },
  });
  return Boolean(blocked);
}

export function loginBlockedMessage(): string {
  return "Your account is not eligible to sign in. Please contact support if you believe this is an error.";
}

export function registerBlockedMessage(): string {
  return "This email address is not eligible to create an account. Please contact support if you believe this is an error.";
}

export function inactiveMessage(): string {
  return "Your account is inactive. Please contact support to reactivate your account.";
}

export function suspendedMessage(): string {
  return "Your account has been suspended. Please contact support for assistance.";
}

export function deletedMessage(): string {
  return "This account is no longer available.";
}

export type UserAuthRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  provider: string;
  image: string | null;
  accountStatus: string;
  forcePasswordReset: boolean;
  phone: string | null;
};

export async function assertCanRegister(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return "Invalid email address.";

  if (await isEmailBlocked(normalized)) {
    return registerBlockedMessage();
  }

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    if (existing.accountStatus === "DELETED") {
      return registerBlockedMessage();
    }
    return "An account with this email already exists.";
  }

  return null;
}

export async function assertCanLogin(user: UserAuthRecord): Promise<string | null> {
  if (await isEmailBlocked(user.email)) {
    return loginBlockedMessage();
  }

  const status = user.accountStatus as AccountStatus;
  switch (status) {
    case "DELETED":
      return deletedMessage();
    case "BLOCKED":
      return loginBlockedMessage();
    case "SUSPENDED":
      return suspendedMessage();
    case "INACTIVE":
      return inactiveMessage();
    case "ACTIVE":
      return null;
    default:
      return null;
  }
}

export async function assertCanPlaceOrder(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (await isEmailBlocked(normalized)) {
    return "This email address cannot be used to place orders. Please contact support.";
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return null;

  if (user.accountStatus === "BLOCKED" || user.accountStatus === "DELETED") {
    return "This account cannot place new orders. Please contact support.";
  }
  if (user.accountStatus === "SUSPENDED" || user.accountStatus === "INACTIVE") {
    return "Your account is restricted from placing orders. Please contact support.";
  }
  return null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(
  userId: string,
  createdBy: "admin" | "self" = "admin",
  expiresHours = 24
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateResetToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      createdBy,
    },
  });

  return { token, expiresAt };
}

export async function consumePasswordResetToken(
  token: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null },
    include: { user: true },
  });

  if (!record) {
    return { ok: false, error: "Invalid or expired reset link." };
  }
  if (record.expiresAt < new Date()) {
    return { ok: false, error: "This reset link has expired. Please request a new one." };
  }

  const passwordHash = await hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, forcePasswordReset: false },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

export function publicUserFields(user: {
  id: string;
  name: string;
  email: string;
  provider: string;
  image: string | null;
  forcePasswordReset?: boolean;
  accountStatus?: string;
  phone?: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    image: user.image,
    forcePasswordReset: user.forcePasswordReset ?? false,
    accountStatus: user.accountStatus ?? "ACTIVE",
    phone: user.phone ?? null,
  };
}
