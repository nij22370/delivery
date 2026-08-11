import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import { withRole } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";
import { JOB_STATUS } from "@/types/job";
import { triggerJobEvent } from "@/lib/triggerJobEvent";

const STATUS_CHANGE_EVENT = "status-change";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── Atomic Deliver: status=in_transit + driverId in the filter prevents
//    out-of-order transitions and non-driver callers. ─────────────────────────
async function handleDeliverJob(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id } = await context.params;

    const deliveredJob = await Job.findOneAndUpdate(
      { _id: id, driverId: user.userId, status: JOB_STATUS.IN_TRANSIT },
      { $set: { status: JOB_STATUS.DELIVERED } },
      { new: true }
    ).lean();

    if (!deliveredJob) {
      return NextResponse.json(
        { message: "Job must be in transit and assigned to you before it can be delivered." },
        { status: 409 }
      );
    }

    await triggerJobEvent(id, STATUS_CHANGE_EVENT, {
      status: JOB_STATUS.DELIVERED,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ job: deliveredJob }, { status: 200 });
  } catch (error: unknown) {
    console.error("Deliver job error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export function POST(req: NextRequest, context: RouteContext) {
  return withRole(["driver"])((authenticatedReq, user) =>
    handleDeliverJob(authenticatedReq, user, context)
  )(req);
}
