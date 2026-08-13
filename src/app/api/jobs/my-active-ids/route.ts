import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import { withAuth } from "@/lib/auth";
import { JOB_STATUS } from "@/types/job";
import type { JwtAccessPayload } from "@/types/auth/auth";

const ACTIVE_JOB_STATUSES = [JOB_STATUS.ACCEPTED, JOB_STATUS.IN_TRANSIT];

async function handleGetMyActiveJobIds(
  req: NextRequest,
  user: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const jobs = await Job.find({
      status: { $in: ACTIVE_JOB_STATUSES },
      $or: [{ posterId: user.userId }, { driverId: user.userId }],
    })
      .select("_id")
      .lean();

    return NextResponse.json({ jobIds: jobs.map((job) => String(job._id)) });
  } catch (error: unknown) {
    console.error("Get my active job ids error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const GET = withAuth(handleGetMyActiveJobIds);
