import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import Payout from "@/models/Payout";
import User from "@/models/User";
import { JOB_STATUS, type JobStatus } from "@/types/job";
import { notifyUser } from "@/lib/notify";
import { triggerJobEvent } from "@/lib/triggerJobEvent";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { ResolveJobInput, ResolveJobResponse } from "@/types/admin/adminDisputes";
import { internalServerError } from "@/lib/apiServerError";

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

    const body = (await req.json()) as ResolveJobInput;
    const { resolvedStatus, note, payoutStatus } = body;

    if (!resolvedStatus || !note) {
      return NextResponse.json(
        { success: false, error: "resolvedStatus and note are required" },
        { status: 400 }
      );
    }

    const allowedResolvedStatuses: JobStatus[] = [
      JOB_STATUS.POSTED,
      JOB_STATUS.CANCELLED,
    ];

    if (!allowedResolvedStatuses.includes(resolvedStatus as JobStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `resolvedStatus must be one of: ${allowedResolvedStatuses.join(", ")}`,
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

    if (job.status !== JOB_STATUS.DISPUTED) {
      return NextResponse.json(
        {
          success: false,
          error: `Only disputed jobs can be resolved. Current status: ${job.status}`,
        },
        { status: 400 }
      );
    }

    job.status = resolvedStatus as JobStatus;
    job.resolutionNote = note;

    (job as { disputeReason?: string }).disputeReason = job.disputeReason;
    (job as { flaggedBy?: string }).flaggedBy = job.flaggedBy;

    if (resolvedStatus === JOB_STATUS.POSTED) {
      job.driverId = null;
    }
    await job.save();

    if (payoutStatus) {
      const allowedPayoutStatuses = ["paid", "failed"] as const;
      if (allowedPayoutStatuses.includes(payoutStatus as "paid" | "failed")) {
        await Payout.updateOne(
          { jobId: job._id },
          { $set: { status: payoutStatus } }
        );
      }
    }

    void triggerJobEvent(job._id.toString(), "status-change", {
      jobId: job._id.toString(),
      status: resolvedStatus,
      updatedAt: new Date().toISOString(),
      resolvedBy: "admin",
      resolutionNote: note,
    }).catch((err) => {
      console.error("Failed to dispatch Pusher status-change event:", err);
    });

    const resolveLink = `/jobs/${job._id.toString()}`;
    const resolveMessage =
      resolvedStatus === JOB_STATUS.CANCELLED
        ? "Your disputed job has been cancelled by an admin."
        : "Your disputed job has been reopened by an admin.";
    void notifyUser(String(job.posterId), resolveMessage, "info", { link: resolveLink });
    if (job.driverId) {
      void notifyUser(String(job.driverId), resolveMessage, "info", { link: resolveLink });
    }
    if (payoutStatus === "paid") {
      if (job.driverId) {
        void notifyUser(
          String(job.driverId),
          "Your payout has been marked as paid by an admin.",
          "success",
          { link: "/driver/payouts" }
        );
      }
    } else if (payoutStatus === "failed") {
      if (job.driverId) {
        void notifyUser(
          String(job.driverId),
          "Your payout was marked as failed by an admin.",
          "error",
          { link: "/driver/payouts" }
        );
      }
    }

    const poster = await User.findById(job.posterId).select("name email").lean();
    const driver = job.driverId
      ? await User.findById(job.driverId).select("name email").lean()
      : null;

    const response: ResolveJobResponse = {
      success: true,
      message: `Dispute resolved: job moved to ${resolvedStatus}`,
      data: {
        _id: job._id.toString(),
        jobCode: `#SWF-${job._id.toString().slice(-4).toUpperCase()}`,
        status: job.status as JobStatus,
        poster: {
          _id: poster?._id?.toString() ?? "unknown",
          name: poster?.name ?? "Unknown Poster",
          email: poster?.email ?? "",
        },
        driver: driver
          ? {
              _id: driver._id.toString(),
              name: driver.name ?? "Unknown Driver",
              email: driver.email ?? "",
            }
          : null,
        disputeReason: (job as { disputeReason?: string }).disputeReason ?? "",
        flaggedBy: ((job as { flaggedBy?: string }).flaggedBy ?? "poster") as "poster" | "driver",
        offeredPrice: job.offeredPrice,
        pickupAddress: job.pickupAddress,
        dropoffAddress: job.dropoffAddress,
        evidenceImages: (job as { evidenceImages?: string[] }).evidenceImages ?? [],
        acceptedAt: (job as { acceptedAt?: Date }).acceptedAt?.toISOString(),
        inTransitAt: (job as { inTransitAt?: Date }).inTransitAt?.toISOString(),
        deliveredAt: (job as { deliveredAt?: Date }).deliveredAt?.toISOString(),
        disputedAt: (job as { disputedAt?: Date }).disputedAt?.toISOString(),
        createdAt: new Date(job.createdAt).toISOString(),
        updatedAt: new Date(job.updatedAt).toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return internalServerError(error, "admin/jobs/resolve");
  }
}

export function PATCH(req: NextRequest, context: RouteContext) {
  return withRole(["admin"])((authenticatedReq, user) =>
    handler(authenticatedReq, user, context)
  )(req);
}
