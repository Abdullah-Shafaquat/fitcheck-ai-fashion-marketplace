import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireSellerAny } from "@/lib/seller-auth";
import {
  validateVerificationFile,
  safeFileName,
  VERIFICATION_PRIVATE_DIR,
  UploadKind,
  isVideoKind,
} from "@/lib/sellerVerificationFiles";

export async function POST(req: NextRequest) {
  const auth = await requireSellerAny(req);
  if (auth.response) return auth.response;
  const seller = auth.seller;
  if (seller.approvalStatus === "APPROVED") {
    return NextResponse.json({ error: "Your seller account is already approved." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind = String(formData.get("kind") || "") as UploadKind;

    if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    if (!["cnic", "verification_image", "video"].includes(kind)) {
      return NextResponse.json({ error: "Invalid upload kind." }, { status: 400 });
    }

    const validationError = validateVerificationFile(file, kind);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const dir = path.join(VERIFICATION_PRIVATE_DIR, seller.id);
    await mkdir(dir, { recursive: true });

    const filename = safeFileName(kind, file.type || "");
    const filePath = path.join(dir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      path: `verification/${seller.id}/${filename}`,
      kind,
      isVideo: isVideoKind(kind),
      size: file.size,
    });
  } catch (error) {
    console.error("[SELLER_VERIFICATION_UPLOAD]", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
