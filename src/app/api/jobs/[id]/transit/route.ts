import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import { withRole } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";
import type { JwtAccessPayload } from "@/types/auth/auth";
import { JOB_STATUS } from "@/types/job";
import { triggerJobEvent } from "@/lib/triggerJobEvent";

const STATUS_CHANGE_EVENT = "status-change";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── Atomic Transit: status=accepted + driverId in the filter prevents
//    out-of-order transitions and non-driver callers. ─────────────────────────
async function handleTransitJob(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id } = await context.params;

    const transitingJob = await Job.findOneAndUpdate(
      { _id: id, driverId: user.userId, status: JOB_STATUS.ACCEPTED },
      { $set: { status: JOB_STATUS.IN_TRANSIT, inTransitAt: new Date() } },
      { new: true }
    ).lean();

    if (!transitingJob) {
      return NextResponse.json(
        { message: "Job must be accepted and assigned to you before it can go in transit." },
        { status: 409 }
      );
    }

    await triggerJobEvent(id, STATUS_CHANGE_EVENT, {
      status: JOB_STATUS.IN_TRANSIT,
      timestamp: new Date().toISOString(),
    });

    void notifyUser(String(transitingJob.posterId), "Your delivery is now in transit.", "info", {
      link: `/jobs/${id}`,
    });

    return NextResponse.json({ job: transitingJob }, { status: 200 });
  } catch (error: unknown) {
    console.error("Transit job error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export function POST(req: NextRequest, context: RouteContext) {
  return withRole(["driver"])((authenticatedReq, user) =>
    handleTransitJob(authenticatedReq, user, context)
  )(req);
}
