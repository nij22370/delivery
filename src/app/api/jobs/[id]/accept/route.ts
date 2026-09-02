import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import DriverProfile from "@/models/DriverProfile";
import { withRole } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";
import { JOB_STATUS } from "@/types/job";
import { DRIVER_PROFILE_STATUS } from "@/types/driverProfile/driverProfile";

const NOT_FOUND_MESSAGE = "Job not found";
const NOT_AVAILABLE_MESSAGE = "Job is no longer available for acceptance.";
const UNVERIFIED_MESSAGE =
  "Your account must be verified before you can accept jobs.";
const VEHICLE_TYPE_MISMATCH_MESSAGE =
  "Your vehicle type does not meet this job's requirements.";
const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

async function handleAcceptJob(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    // Guard 1 — job must exist and be in the posted state.
    const job = await Job.findById(id).lean();
    if (!job) {
      return NextResponse.json({ message: NOT_FOUND_MESSAGE }, { status: 404 });
    }
    if (job.status !== JOB_STATUS.POSTED) {
      return NextResponse.json({ message: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    // Guard 2 — driver must have an approved DriverProfile.
    const driverProfile = await DriverProfile.findOne({ userId: user.userId }).lean();
    if (!driverProfile || driverProfile.status !== DRIVER_PROFILE_STATUS.APPROVED) {
      return NextResponse.json({ message: UNVERIFIED_MESSAGE }, { status: 403 });
    }

    // Guard 3 — driver vehicle type must match the job's required vehicle type.
    if (driverProfile.vehicleType !== job.vehicleType) {
      return NextResponse.json(
        { message: VEHICLE_TYPE_MISMATCH_MESSAGE },
        { status: 403 }
      );
    }

    // Atomic accept — the { status: "posted" } filter is the last-line defense
    // against a race where another driver accepted this job between the read
    // above and the update here.
    const acceptedJob = await Job.findOneAndUpdate(
      { _id: id, status: JOB_STATUS.POSTED },
      {
        $set: {
          status: JOB_STATUS.ACCEPTED,
          driverId: user.userId,
          acceptedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!acceptedJob) {
      return NextResponse.json({ message: NOT_AVAILABLE_MESSAGE }, { status: 409 });
    }

    return NextResponse.json({ job: acceptedJob }, { status: 200 });
  } catch (error: unknown) {
    console.error("Accept job error:", error);
    return NextResponse.json(
      { message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}

export function POST(req: NextRequest, context: RouteContext) {
  return withRole(["driver"])((authenticatedReq, user) =>
    handleAcceptJob(authenticatedReq, user, context)
  )(req);
}
