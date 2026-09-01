import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";

const PROFILE_PHOTO_FOLDER = "profile-photos";
const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function handler(req: NextRequest, user: JwtAccessPayload) {
  try {
    const body: { publicId?: string } = await req.json().catch(() => ({}));
    const publicId =
      typeof body.publicId === "string" && body.publicId.length > 0
        ? body.publicId
        : user.userId;

    const timestamp = Math.round(Date.now() / 1000);
    const folder = `${PROFILE_PHOTO_FOLDER}/${user.userId}`;
    const paramsToSign = { timestamp, folder, public_id: publicId };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      public_id: publicId,
      folder,
    });
  } catch (error: unknown) {
    console.error("Profile photo sign error:", error);
    const message =
      error instanceof Error ? error.message : INTERNAL_SERVER_ERROR_MESSAGE;
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const POST = withAuth(handler);
