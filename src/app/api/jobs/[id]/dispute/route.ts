import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withAuth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import { JOB_STATUS, type JobStatus } from "@/types/job";
import { triggerJobEvent } from "@/lib/triggerJobEvent";
import type { JwtAccessPayload } from "@/types/auth/auth";
import { internalServerError } from "@/lib/apiServerError";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handler(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Job ID format" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as { reason?: string };
    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { success: false, error: "Dispute reason is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    const isPoster = String(job.posterId) === user.userId;
    const isDriver = String(job.driverId) === user.userId;

    if (!isPoster && !isDriver) {
      return NextResponse.json(
        { success: false, error: "Only job participants can flag a dispute" },
        { status: 403 }
      );
    }

    const disputableStatuses: JobStatus[] = [
      JOB_STATUS.ACCEPTED,
      JOB_STATUS.IN_TRANSIT,
      JOB_STATUS.DELIVERED,
    ];

    if (!disputableStatuses.includes(job.status as JobStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot dispute a job with status '${job.status}'`,
        },
        { status: 400 }
      );
    }

    job.status = JOB_STATUS.DISPUTED;
    job.disputeReason = reason;
    (job as { flaggedBy?: string }).flaggedBy = isPoster ? "poster" : "driver";
    (job as { disputedAt?: Date }).disputedAt = new Date();
    await job.save();

    void triggerJobEvent(job._id.toString(), "status-change", {
      jobId: job._id.toString(),
      status: JOB_STATUS.DISPUTED,
      updatedAt: new Date().toISOString(),
      disputeReason: reason,
      flaggedBy: isPoster ? "poster" : "driver",
    }).catch((err) => {
      console.error("Failed to dispatch Pusher status-change event:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Dispute flagged successfully",
      data: {
        _id: job._id.toString(),
        status: job.status,
        disputeReason: job.disputeReason,
        flaggedBy: job.flaggedBy,
      },
    });
  } catch (error: unknown) {
    return internalServerError(error, "jobs/dispute");
  }
}

export function POST(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, user) =>
    handler(authenticatedReq, user, context)
  )(req);
}
