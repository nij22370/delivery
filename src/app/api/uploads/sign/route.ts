import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import type { JwtAccessPayload } from "@/types/auth/auth";
import { internalServerError } from "@/lib/apiServerError";

const ALLOWED_DOCUMENT_TYPES = ["licence", "insurance", "government_id"] as const;
type DocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];

const UPLOAD_FOLDER_PREFIX = "driver-verification";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function handler(req: NextRequest, user: JwtAccessPayload) {
  try {
    const body: { documentType?: string } = await req.json();
    const documentType = body.documentType;

    if (!documentType || !ALLOWED_DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      return NextResponse.json({ message: "Invalid documentType" }, { status: 400 });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = `${UPLOAD_FOLDER_PREFIX}/${user.userId}`;
    const paramsToSign = { timestamp, folder, public_id: documentType };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      public_id: documentType,
      folder,
    });
  } catch (error: unknown) {
    return internalServerError(error, "uploads/sign");
  }
}

export const POST = withRole(["driver"])(handler);
