import prisma from "@/lib/prisma";

export const AUDIT_ACTIONS = [
  "CUSTOMER_UPDATED",
  "CUSTOMER_ACTIVATED",
  "CUSTOMER_DEACTIVATED",
  "CUSTOMER_SUSPENDED",
  "CUSTOMER_BLOCKED",
  "CUSTOMER_UNBLOCKED",
  "CUSTOMER_DELETED",
  "PASSWORD_RESET_INITIATED",
  "FORCE_PASSWORD_RESET",
  "BLOCKED_EMAIL_ADDED",
  "BLOCKED_EMAIL_REMOVED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export async function logCustomerAudit(opts: {
  action: AuditAction;
  targetEmail: string;
  targetUserId?: string | null;
  adminId?: string;
  details?: Record<string, unknown> | string | null;
}): Promise<void> {
  try {
    await prisma.customerAuditLog.create({
      data: {
        action: opts.action,
        targetEmail: opts.targetEmail.trim().toLowerCase(),
        targetUserId: opts.targetUserId ?? null,
        adminId: opts.adminId ?? "admin",
        details:
          typeof opts.details === "string"
            ? opts.details
            : opts.details
              ? JSON.stringify(opts.details)
              : null,
      },
    });
  } catch (error) {
    console.error("[CUSTOMER_AUDIT]", error);
  }
}
