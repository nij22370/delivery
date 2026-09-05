import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import { JOB_STATUS, type JobStatus } from "@/types/job";
import { triggerJobEvent } from "@/lib/triggerJobEvent";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { AllowedOverrideStatus, StatusOverrideResponse } from "@/types/admin/adminJobs";
import { internalServerError } from "@/lib/apiServerError";

const ALLOWED_OVERRIDES: Record<string, AllowedOverrideStatus[]> = {
  [JOB_STATUS.POSTED]: ["cancelled"],
  [JOB_STATUS.ACCEPTED]: ["cancelled"],
  [JOB_STATUS.IN_TRANSIT]: ["cancelled"],
  [JOB_STATUS.DISPUTED]: ["cancelled", "posted"],
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handler(
  req: NextRequest,
  _user: JwtAccessPayload,
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

    const body = (await req.json()) as { status?: string; reason?: string };
    const targetStatus = body.status?.trim().toLowerCase();

    if (!targetStatus) {
      return NextResponse.json(
        { success: false, error: "Target status is required" },
        { status: 400 }
      );
    }

    // Explicit check: terminal status JOB_STATUS.DELIVERED is sacred and strictly forbidden
    if (targetStatus === JOB_STATUS.DELIVERED || targetStatus === "delivered") {
      return NextResponse.json(
        {
          success: false,
          error: "Status override to DELIVERED is forbidden. Terminal status is sacred.",
        },
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

    // Terminal status is sacred: delivered jobs cannot be modified
    if (job.status === JOB_STATUS.DELIVERED) {
      return NextResponse.json(
        {
          success: false,
          error: "Delivered jobs cannot be modified. Terminal state is immutable.",
        },
        { status: 400 }
      );
    }

    const currentStatus = job.status as string;
    const allowedForCurrent = ALLOWED_OVERRIDES[currentStatus] || [];

    if (!allowedForCurrent.includes(targetStatus as AllowedOverrideStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status override from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowedForCurrent.join(", ") || "none"}.`,
        },
        { status: 400 }
      );
    }

    // Apply update
    job.status = targetStatus as JobStatus;
    if (targetStatus === JOB_STATUS.POSTED) {
      job.driverId = null;
    }
    await job.save();

    // Dispatch Pusher event
    void triggerJobEvent(job._id.toString(), "status-change", {
      jobId: job._id.toString(),
      status: targetStatus,
      updatedAt: new Date().toISOString(),
      overrideBy: "admin",
      reason: body.reason,
    }).catch((err) => {
      console.error("Failed to dispatch Pusher status-change event:", err);
    });

    const response: StatusOverrideResponse = {
      success: true,
      message: `Job status updated to ${targetStatus}`,
      data: {
        _id: job._id.toString(),
        jobCode: `#SWF-${job._id.toString().slice(-4).toUpperCase()}`,
        status: job.status,
        poster: {
          _id: job.posterId.toString(),
          name: "Poster",
          email: "",
          role: "poster",
        },
        driver: null,
        pickupAddress: job.pickupAddress,
        pickupContactName: job.pickupContactName,
        pickupPhone: job.pickupPhone,
        dropoffAddress: job.dropoffAddress,
        dropoffContactName: job.dropoffContactName,
        dropoffPhone: job.dropoffPhone,
        vehicleType: job.vehicleType,
        packageDescription: job.packageDescription,
        offeredPrice: job.offeredPrice,
        pickupDate: job.pickupDate,
        pickupTimeWindow: job.pickupTimeWindow,
        paymentStatus: job.paymentStatus,
        createdAt: new Date(job.createdAt).toISOString(),
        updatedAt: new Date(job.updatedAt).toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return internalServerError(error, "admin/jobs/status");
  }
}

export function PATCH(req: NextRequest, context: RouteContext) {
  return withRole(["admin"])((authenticatedReq, user) =>
    handler(authenticatedReq, user, context)
  )(req);
}
