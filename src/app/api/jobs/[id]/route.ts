import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";
import { JOB_STATUS } from "@/types/job";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handleGetJobById(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id } = await context.params;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ message: "Invalid job ID" }, { status: 400 });
    }

    const job = await Job.findById(id).lean();

    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    // Role scoping: posters can only view their own jobs
    if (user.role === "poster" && String(job.posterId) !== user.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Drivers can only view posted jobs or their own accepted job
    if (user.role === "driver") {
      const isDriversOwnJob = String(job.driverId) === user.userId;
      const isOpenJob = job.status === JOB_STATUS.POSTED;
      if (!isOpenJob && !isDriversOwnJob) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ job }, { status: 200 });
  } catch (error: unknown) {
    console.error("Get job by ID error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export function GET(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, user) =>
    handleGetJobById(authenticatedReq, user, context)
  )(req);
}
