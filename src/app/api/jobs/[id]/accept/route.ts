import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import { withRole } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth";
import { JOB_STATUS } from "@/types/job";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── Atomic Accept: status=posted in the filter prevents double-accept ─────────
async function handleAcceptJob(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id } = await context.params;

    const acceptedJob = await Job.findOneAndUpdate(
      { _id: id, status: JOB_STATUS.POSTED },
      { $set: { status: JOB_STATUS.ACCEPTED, driverId: user.userId } },
      { new: true }
    ).lean();

    if (!acceptedJob) {
      return NextResponse.json(
        { message: "Job is no longer available for acceptance." },
        { status: 409 }
      );
    }

    return NextResponse.json({ job: acceptedJob }, { status: 200 });
  } catch (error: unknown) {
    console.error("Accept job error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export function POST(req: NextRequest, context: RouteContext) {
  return withRole(["driver"])((authenticatedReq, user) =>
    handleAcceptJob(authenticatedReq, user, context)
  )(req);
}
