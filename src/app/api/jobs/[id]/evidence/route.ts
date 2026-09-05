import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withAuth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import { v2 as cloudinary } from "cloudinary";
import type { JwtAccessPayload } from "@/types/auth/auth";
import { internalServerError } from "@/lib/apiServerError";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const UPLOAD_FOLDER = "dispute-evidence";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handler(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Job ID format" },
        { status: 400 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("files");

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files uploaded" },
        { status: 400 }
      );
    }

    await connectDB();

    const job = await Job.findById(id).lean();
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    const isPoster = String(job.posterId) === user.userId;
    const isDriver = job.driverId !== null && String(job.driverId) === user.userId;

    if (!isPoster && !isDriver) {
      return NextResponse.json(
        { success: false, error: "Only job participants can upload evidence" },
        { status: 403 }
      );
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        continue;
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `Invalid file type: ${file.type}. Allowed: jpeg, png, webp` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File too large: ${file.name}. Max 5MB per file.` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const folder = `${UPLOAD_FOLDER}/${id}`;
      const publicId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: "image",
            transformation: [{ width: 1200, quality: "auto" }],
          },
          (error, uploadResult) => {
            if (error) {
              reject(error);
            } else if (uploadResult) {
              resolve({ secure_url: uploadResult.secure_url });
            } else {
              reject(new Error("Cloudinary upload returned no result"));
            }
          }
        );
        stream.end(buffer);
      });

      uploadedUrls.push(result.secure_url);
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid files were uploaded" },
        { status: 400 }
      );
    }

    const updatedJob = await Job.findByIdAndUpdate(
      id,
      { $push: { evidenceImages: { $each: uploadedUrls } } },
      { new: true }
    ).lean();

    return NextResponse.json({
      success: true,
      data: {
        jobId: id,
        evidenceImages: (updatedJob?.evidenceImages as string[]) ?? [],
        uploaded: uploadedUrls,
      },
    });
  } catch (error: unknown) {
    return internalServerError(error, "jobs/evidence");
  }
}

export function POST(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, user) =>
    handler(authenticatedReq, user, context)
  )(req);
}
