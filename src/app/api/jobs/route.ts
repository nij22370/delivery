import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import DriverProfile from "@/models/DriverProfile";
import { withRole, withAuth } from "@/lib/auth";
import { jobCreationSchema, JOB_STATUS, JOB_VEHICLE_TYPE } from "@/types/job";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { JobStatus, JobVehicleType } from "@/types/job";

// ── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const FALLBACK_PAGE = 1;
const NO_MATCH_VEHICLE_TYPE = "__none__";

// ── Helpers ──────────────────────────────────────────────────────────────────
async function resolveDriverVehicleType(
  userId: string
): Promise<string | null> {
  const profile = await DriverProfile.findOne({ userId })
    .select("vehicleType")
    .lean();
  return profile?.vehicleType ?? null;
}

function buildRoleScopedFilter(
  user: JwtAccessPayload,
  statusParam: string | null,
  vehicleTypeParam: string | null,
  driverIdParam: string | null,
  driverVehicleType: string | null
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (user.role === "poster") {
    // Posters only ever see their own jobs — never other posters' jobs.
    filter.posterId = user.userId;
  } else if (user.role === "driver") {
    // Drivers default to open jobs (status: posted) unless they explicitly
    // request their own accepted jobs via ?driverId=me. Layered filters
    // never override the scoping — they only narrow within it.
    if (driverIdParam === "me") {
      filter.driverId = user.userId;
    } else {
      // Default view: all open jobs available to accept.
      // A driver cannot see other drivers' accepted jobs — the status filter
      // is bounded to "posted" unless the driver is scoping to their own jobs.
      filter.status = JOB_STATUS.POSTED;
      // Drivers see only open jobs that match their verified vehicle type.
      // If they have no DriverProfile yet, return zero jobs (an impossible
      // vehicleType value guarantees an empty result set).
      filter.vehicleType = driverVehicleType ?? NO_MATCH_VEHICLE_TYPE;
    }
  }
  // Admin: no baseline scoping; sees all jobs.

  // Layer status filter on top of role scope (never overrides poster/driver scoping).
  if (statusParam && Object.values(JOB_STATUS).includes(statusParam as JobStatus)) {
    if (user.role === "driver" && driverIdParam !== "me") {
      // Drivers without driverId=me cannot filter to non-posted statuses
      // to prevent viewing other drivers' accepted/in_transit jobs.
      if (statusParam === JOB_STATUS.POSTED) {
        filter.status = JOB_STATUS.POSTED;
      }
      // Any other status filter from a scoped driver is silently ignored.
    } else {
      filter.status = statusParam;
    }
  }

  if (
    vehicleTypeParam &&
    Object.values(JOB_VEHICLE_TYPE).includes(vehicleTypeParam as JobVehicleType) &&
    user.role !== "driver"
  ) {
    filter.vehicleType = vehicleTypeParam;
  }

  return filter;
}

function parsePaginationParams(
  pageParam: string | null,
  limitParam: string | null
): { page: number; limit: number; skip: number } {
  const page = Math.max(FALLBACK_PAGE, parseInt(pageParam ?? "1", 10) || FALLBACK_PAGE);
  const limit = Math.min(
    PAGE_SIZE,
    Math.max(1, parseInt(limitParam ?? String(PAGE_SIZE), 10) || PAGE_SIZE)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// ── POST /api/jobs — Create a Job (poster only) ───────────────────────────────
async function handleCreateJob(
  req: NextRequest,
  user: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const body = await req.json();
    const validationResult = jobCreationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Invalid input",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      pickupAddress,
      pickupContactName,
      pickupPhone,
      pickupInstructions,
      dropoffAddress,
      dropoffContactName,
      dropoffPhone,
      vehicleType,
      packageDescription,
      offeredPrice,
      pickupDate,
      pickupTimeWindow,
    } = validationResult.data;

    const job = await Job.create({
      posterId: user.userId,
      status: JOB_STATUS.POSTED,
      pickupAddress,
      pickupContactName,
      pickupPhone,
      pickupInstructions,
      dropoffAddress,
      dropoffContactName,
      dropoffPhone,
      vehicleType,
      packageDescription,
      offeredPrice,
      pickupDate,
      pickupTimeWindow,
    });

    return NextResponse.json({ message: "Job created successfully", job }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create job error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const POST = withRole(["poster"])(handleCreateJob);

// ── GET /api/jobs — List and Filter Jobs (any authenticated role) ─────────────
async function handleListJobs(
  req: NextRequest,
  user: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const vehicleTypeParam = searchParams.get("vehicleType");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const driverIdParam = searchParams.get("driverId");

    let driverVehicleType: string | null = null;
    if (user.role === "driver") {
      driverVehicleType = await resolveDriverVehicleType(user.userId);
    }

    const filter = buildRoleScopedFilter(
      user,
      statusParam,
      vehicleTypeParam,
      driverIdParam,
      driverVehicleType
    );
    const { page, limit, skip } = parsePaginationParams(pageParam, limitParam);

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("driverId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ jobs, total, page, totalPages }, { status: 200 });
  } catch (error: unknown) {
    console.error("List jobs error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const GET = withAuth(handleListJobs);
