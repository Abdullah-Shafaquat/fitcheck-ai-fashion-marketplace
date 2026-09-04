import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Private verification file storage. Files are stored OUTSIDE of `public/`
 * so they are never served statically. They are only reachable through the
 * authorization-checked `GET /api/seller/verification/file` route.
 */
export const VERIFICATION_PRIVATE_DIR = path.join(process.cwd(), "private", "uploads", "verification");

export const IMAGE_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const VIDEO_MIME: Record<string, string> = {
  "video/webm": ".webm",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024; // 30MB
export const MAX_VIDEO_DURATION_S = 60; // 60s
export const MAX_UPLOADS_PER_KIND = 12;

export type UploadKind = "cnic" | "verification_image" | "video";

export function validateVerificationFile(file: { type: string; size: number }, kind: UploadKind): string | null {
  if (kind === "video") {
    if (!VIDEO_MIME[file.type]) {
      return "Unsupported video format. Please record using your camera (WebM/MP4).";
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return "Video is too large. Maximum size is 30MB.";
    }
    return null;
  }
  // image kinds (cnic / verification_image)
  if (!IMAGE_MIME[file.type]) {
    return "Invalid image type. Please upload JPG, PNG, or WEBP.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image is too large. Maximum size is 5MB.";
  }
  return null;
}

export function extensionFor(file: { type: string }, kind: UploadKind): string {
  if (kind === "video") return VIDEO_MIME[file.type] || ".webm";
  return IMAGE_MIME[file.type] || ".jpg";
}

export function safeFileName(kind: UploadKind, fileType: string): string {
  return `${kind}-${uuidv4()}${extensionFor({ type: fileType }, kind)}`;
}

export function isVideoKind(kind: UploadKind): boolean {
  return kind === "video";
}
