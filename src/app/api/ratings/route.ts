import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import Rating from "@/models/Rating";
import { ratingSubmitSchema } from "@/types/rating";
import { updateDriverRating } from "@/lib/updateDriverRating";
import { JOB_STATUS } from "@/types/job";

const E11000_DUPLICATE_CODE = 11000;

async function handleSubmitRating(
  req: NextRequest,
  user: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const body: unknown = await req.json();
    const validationResult = ratingSubmitSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { jobId, toUserId, score, comment } = validationResult.data;

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    if (job.status !== JOB_STATUS.DELIVERED) {
      return NextResponse.json(
        { message: "Ratings can only be submitted for delivered jobs" },
        { status: 400 }
      );
    }

    const isPoster = String(job.posterId) === user.userId;
    const isDriver = String(job.driverId) === user.userId;
    if (!isPoster && !isDriver) {
      return NextResponse.json(
        { message: "You are not a participant in this job" },
        { status: 403 }
      );
    }

    if (toUserId === user.userId) {
      return NextResponse.json(
        { message: "Cannot rate yourself" },
        { status: 400 }
      );
    }

    const expectedRecipient = isPoster
      ? String(job.driverId)
      : String(job.posterId);
    if (toUserId !== expectedRecipient) {
      return NextResponse.json(
        { message: "Invalid recipient" },
        { status: 400 }
      );
    }

    const rating = await Rating.create({
      jobId,
      fromUserId: user.userId,
      toUserId,
      score,
      comment: comment || null,
    });

    updateDriverRating(toUserId).catch((err: unknown) => {
      console.error("Failed to update driver rating:", err);
    });

    return NextResponse.json({ rating }, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === E11000_DUPLICATE_CODE
    ) {
      return NextResponse.json(
        { message: "You have already rated this job" },
        { status: 409 }
      );
    }
    console.error("Submit rating error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handleSubmitRating);
