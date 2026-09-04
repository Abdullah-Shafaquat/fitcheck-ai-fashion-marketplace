import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { promises as fsF } from "fs";
import { requireSellerAny } from "@/lib/seller-auth";
import { requireAdmin } from "@/lib/admin-auth";
import { VERIFICATION_PRIVATE_DIR, IMAGE_MIME } from "@/lib/sellerVerificationFiles";

const VIDEO_MIME_TYPE: Record<string, string> = {
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
};

function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (VIDEO_MIME_TYPE[ext]) return VIDEO_MIME_TYPE[ext];
  return "application/octet-stream";
}

function isAllowedPath(p: string): boolean {
  const fn = path.basename(p);
  return /^(cnic|verification_image|video)-[0-9a-f-]+\.(jpg|jpeg|png|webp|webm|mp4|mov)$/i.test(fn);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const requested = String(url.searchParams.get("path") || "");

  // Path format: verification/{sellerId}/{filename}
  const parts = requested.split("/");
  if (parts.length !== 3 || parts[0] !== "verification" || !isAllowedPath(parts[2])) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const sellerId = parts[1];

  // Authorization: owner seller OR admin. Never public.
  const sellerAuth = await requireSellerAny(req);
  let authorizedAsSeller = false;
  if (!sellerAuth.response) {
    authorizedAsSeller = String(sellerAuth.seller.id) === sellerId;
  }
  const adminRes = requireAdmin(req);
  const authorizedAsAdmin = adminRes === null;

  if (!authorizedAsSeller && !authorizedAsAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const filePath = path.join(VERIFICATION_PRIVATE_DIR, sellerId, parts[2]);
  const resolvedRoot = path.join(VERIFICATION_PRIVATE_DIR, sellerId);
  if (!filePath.startsWith(resolvedRoot + path.sep) && filePath !== resolvedRoot) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    await fsF.access(filePath);
    const data = await readFile(filePath);
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(parts[2]),
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
