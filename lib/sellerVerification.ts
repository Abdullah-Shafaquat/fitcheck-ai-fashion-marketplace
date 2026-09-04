import prisma from "@/lib/prisma";
import { logSellerAudit } from "@/lib/sellerAudit";
import { notifySeller } from "@/lib/sellerNotifications";
import { getAutoApproveSellers } from "@/lib/sellerSettings";

// Configurable required verification images (label => key). Stored per image.
export const VERIFICATION_IMAGES = [
  { key: "profile_face", label: "Profile / Face Image", required: true },
  { key: "identity_selfie", label: "Identity Verification Image (holding CNIC)", required: true },
  { key: "business_store", label: "Business / Store Image", required: true },
] as const;

export const VERIFICATION_STATES = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  RESUBMISSION_REQUESTED: "RESUBMISSION_REQUESTED",
} as const;

export type VerificationState = (typeof VERIFICATION_STATES)[keyof typeof VERIFICATION_STATES];

const CNIC_REGEX = /^[0-9]{5}-[0-9]{7}-[0-9]$/;
const CNIC_RAW_REGEX = /^[0-9]{13}$/;

/** Normalize a Pakistani CNIC into `#####-#######-#`. Returns null if invalid. */
export function normalizeCnic(value: string): string | null {
  const v = String(value || "").trim();
  if (CNIC_REGEX.test(v)) return v;
  if (CNIC_RAW_REGEX.test(v)) return `${v.slice(0, 5)}-${v.slice(5, 12)}-${v.slice(12)}`;
  return null;
}

export function isValidCnic(value: string): boolean {
  return normalizeCnic(value) !== null;
}

/** Mask a CNIC for display: keep first 5 and last 1, mask the middle 7. */
export function maskCnic(value: string): string {
  const normalized = normalizeCnic(value);
  if (!normalized) return "—";
  const [, middle] = normalized.split("-");
  const masked = "*".repeat(middle?.length ?? 7);
  return normalized.replace(`-${middle}-`, `-${masked}-`);
}

export interface VerificationImageInput {
  key: string;
  label: string;
  path: string;
}

export function isVerificationComplete(v: {
  cnicStatus?: string;
  imagesStatus?: string;
  videoStatus?: string;
}): boolean {
  return (
    v?.cnicStatus === "VERIFIED" &&
    v?.imagesStatus === "VERIFIED" &&
    v?.videoStatus === "VERIFIED"
  );
}

export function serializeVerification(v: any, { forOwner = false } = {}) {
  if (!v) return null;
  const base = {
    id: v.id,
    cnicStatus: v.cnicStatus,
    cnicReason: v.cnicReason,
    imagesStatus: v.imagesStatus,
    imagesReason: v.imagesReason,
    videoStatus: v.videoStatus,
    videoReason: v.videoReason,
    submittedAt: v.submittedAt?.toISOString() ?? null,
    resubmissionRequiredAt: v.resubmissionRequiredAt?.toISOString() ?? null,
    lastReviewedBy: v.lastReviewedBy,
    updatedAt: v.updatedAt?.toISOString() ?? null,
    createdAt: v.createdAt?.toISOString() ?? null,
    liveVideoDuration: v.liveVideoDuration ?? null,
    liveVideoThumbnail: v.liveVideoThumbnail ?? null,
    // Masked CNIC for owner view; full for admin
    cnicNumber: forOwner ? (v.cnicNumber ? maskCnic(v.cnicNumber) : null) : v.cnicNumber ?? null,
    // File paths are private; only returned when authorized
    cnicFrontPath: v.cnicFrontPath ?? null,
    cnicBackPath: v.cnicBackPath ?? null,
    verificationImages: v.verificationImages ?? [],
    liveVideoPath: v.liveVideoPath ?? null,
  };
  return base;
}

export async function getVerificationForSeller(sellerId: string) {
  return prisma.sellerVerification.findUnique({ where: { sellerId } });
}

export async function getVerificationForAdmin(sellerId: string) {
  const v = await prisma.sellerVerification.findUnique({ where: { sellerId } });
  return v ? serializeVerification(v, { forOwner: false }) : null;
}

/**
 * Submit (or resubmit) the full identity verification package. Requires all
 * three mandatory items to be present. Resets per-item status to PENDING.
 */
export async function submitVerification(input: {
  sellerId: string;
  cnicNumber: string;
  cnicFrontPath: string;
  cnicBackPath: string;
  images: VerificationImageInput[];
  liveVideoPath: string;
  liveVideoDuration?: number | null;
  liveVideoThumbnail?: string | null;
}): Promise<{ ok: true; verification: any } | { ok: false; error: string }> {
  const seller = await prisma.sellerProfile.findUnique({ where: { id: input.sellerId } });
  if (!seller) return { ok: false, error: "Seller not found." };

  const cnicNumber = normalizeCnic(input.cnicNumber);
  if (!cnicNumber) return { ok: false, error: "A valid CNIC number (#####-#######-#) is required." };
  if (!input.cnicFrontPath || !input.cnicBackPath) {
    return { ok: false, error: "Both CNIC front and back images are required." };
  }

  const requiredKeys: string[] = [];
  for (const req of VERIFICATION_IMAGES) {
    if (!req.required) continue;
    const present = (input.images || []).find((i) => i.key === req.key && i.path);
    if (!present) return { ok: false, error: `Missing required verification image: ${req.label}` };
    requiredKeys.push(req.key);
  }
  if (!input.images || input.images.length < requiredKeys.length) {
    return { ok: false, error: "All required verification images must be uploaded." };
  }

  if (!input.liveVideoPath) {
    return { ok: false, error: "A live camera verification video is required." };
  }

  const existing = await prisma.sellerVerification.findUnique({ where: { sellerId: input.sellerId } });
  const isResubmit = Boolean(existing && existing.submittedAt);

  const verification =
    existing && existing.submittedAt
      ? await prisma.sellerVerification.update({
          where: { sellerId: input.sellerId },
          data: {
            cnicNumber,
            cnicFrontPath: input.cnicFrontPath,
            cnicBackPath: input.cnicBackPath,
            verificationImages: input.images as any,
            liveVideoPath: input.liveVideoPath,
            liveVideoDuration: input.liveVideoDuration ?? null,
            liveVideoThumbnail: input.liveVideoThumbnail ?? null,
            cnicStatus: "PENDING",
            cnicReason: null,
            cnicReviewedAt: null,
            imagesStatus: "PENDING",
            imagesReason: null,
            imagesReviewedAt: null,
            videoStatus: "PENDING",
            videoReason: null,
            videoReviewedAt: null,
            resubmissionRequiredAt: null,
            submittedAt: new Date(),
            updatedAt: new Date(),
          },
        })
      : await prisma.sellerVerification.create({
          data: {
            sellerId: input.sellerId,
            cnicNumber,
            cnicFrontPath: input.cnicFrontPath,
            cnicBackPath: input.cnicBackPath,
            verificationImages: input.images as any,
            liveVideoPath: input.liveVideoPath,
            liveVideoDuration: input.liveVideoDuration ?? null,
            liveVideoThumbnail: input.liveVideoThumbnail ?? null,
            submittedAt: new Date(),
          },
        });

  await prisma.sellerProfile.update({
    where: { id: input.sellerId },
    data: { verificationStatus: "SUBMITTED" },
  });

  await logSellerAudit({
    sellerId: input.sellerId,
    action: isResubmit ? "SELLER_VERIFICATION_RESUBMITTED" : "SELLER_VERIFICATION_SUBMITTED",
    performedBy: input.sellerId,
    details: { hasImages: input.images.length, hasVideo: Boolean(input.liveVideoPath) },
  });
  await notifySeller(input.sellerId, {
    type: "verification",
    title: "Verification Submitted",
    message: "Your identity verification has been submitted. It is now under review by our team.",
    link: "/seller/verification",
  });

  return { ok: true, verification };
}

/**
 * Admin reviews a single verification item. Action: VERIFIED | REJECTED | RESUBMISSION_REQUESTED.
 * Reason is required for REJECTED and RESUBMISSION_REQUESTED.
 */
export async function reviewVerificationItem(input: {
  sellerId: string;
  item: "cnic" | "images" | "video";
  action: VerificationState;
  reason?: string;
  performedBy?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { item, action } = input;
  if (!VERIFICATION_STATES_PUBLIC.includes(action)) {
    return { ok: false, error: "Invalid action." };
  }
  if ((action === "REJECTED" || action === "RESUBMISSION_REQUESTED") && !input.reason?.trim()) {
    return { ok: false, error: "A reason is required." };
  }

  const existing = await prisma.sellerVerification.findUnique({ where: { sellerId: input.sellerId } });
  if (!existing) return { ok: false, error: "Verification not found." };

  const field =
    item === "cnic"
      ? { cnicStatus: action, cnicReason: input.reason?.trim() ?? null, cnicReviewedAt: new Date() }
      : item === "images"
        ? { imagesStatus: action, imagesReason: input.reason?.trim() ?? null, imagesReviewedAt: new Date() }
        : { videoStatus: action, videoReason: input.reason?.trim() ?? null, videoReviewedAt: new Date() };

  const updated = await prisma.sellerVerification.update({
    where: { sellerId: input.sellerId },
    data: { ...field, lastReviewedBy: input.performedBy || "admin", updatedAt: new Date() },
  });

  // Recompute overall verification status
  const allVerified = isVerificationComplete(updated);
  const anyIssue = [updated.cnicStatus, updated.imagesStatus, updated.videoStatus].some(
    (s) => s === "REJECTED" || s === "RESUBMISSION_REQUESTED"
  );
  await prisma.sellerProfile.update({
    where: { id: input.sellerId },
    data: {
      verificationStatus: allVerified ? "VERIFIED" : anyIssue ? "RESUBMISSION_REQUIRED" : "UNDER_REVIEW",
    },
  });

  // Auto-approve: if the marketplace is configured to auto-approve sellers and
  // identity verification just became complete, promote the seller to APPROVED.
  // This is the ONLY place auto-approve may take effect — never at application
  // submission (where verification is necessarily incomplete).
  const sellerFresh = await prisma.sellerProfile.findUnique({ where: { id: input.sellerId } });
  if (
    allVerified &&
    sellerFresh &&
    sellerFresh.approvalStatus !== "APPROVED" &&
    (await getAutoApproveSellers())
  ) {
    await prisma.sellerProfile.update({
      where: { id: input.sellerId },
      data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: "system" },
    });
    await prisma.user.update({
      where: { id: sellerFresh.userId },
      data: { role: "SELLER" },
    });
    await logSellerAudit({
      sellerId: input.sellerId,
      action: "SELLER_APPROVED",
      performedBy: "system",
      details: { auto: true, reason: "Identity verification complete and auto-approve enabled." },
    });
    await notifySeller(input.sellerId, {
      type: "account",
      title: "Seller Application Approved",
      message: "Your identity verification is complete and your store has been auto-approved. You can now add products.",
      link: "/seller",
    });
  }

  const auditAction =
    item === "cnic"
      ? action === "VERIFIED"
        ? "CNIC_VERIFIED"
        : action === "REJECTED"
          ? "CNIC_REJECTED"
          : "CNIC_RESUBMISSION_REQUESTED"
      : item === "images"
        ? action === "VERIFIED"
          ? "VERIFICATION_IMAGES_VERIFIED"
          : action === "REJECTED"
            ? "VERIFICATION_IMAGES_REJECTED"
            : "VERIFICATION_IMAGES_RESUBMISSION_REQUESTED"
        : action === "VERIFIED"
          ? "LIVE_VIDEO_VERIFIED"
          : action === "REJECTED"
            ? "LIVE_VIDEO_REJECTED"
            : "LIVE_VIDEO_RESUBMISSION_REQUESTED";

  await logSellerAudit({
    sellerId: input.sellerId,
    action: auditAction,
    performedBy: input.performedBy || "admin",
    details: { item, reason: input.reason?.trim() || null },
  });

  const itemLabel = item === "cnic" ? "CNIC" : item === "images" ? "Verification Images" : "Live Video";
  const notifyTitle =
    action === "VERIFIED"
      ? `${itemLabel} Verified`
      : action === "REJECTED"
        ? `${itemLabel} Rejected`
        : `${itemLabel} Resubmission Required`;
  await notifySeller(input.sellerId, {
    type: "verification",
    title: notifyTitle,
    message:
      action === "VERIFIED"
        ? `Great news! Your ${itemLabel.toLowerCase()} has been verified.`
        : `Your seller verification requires attention (${itemLabel}). Reason: ${input.reason?.trim() || "Please resubmit."}`,
    link: "/seller/verification",
  });

  return { ok: true };
}

export const VERIFICATION_STATES_PUBLIC: string[] = Object.values(VERIFICATION_STATES);
