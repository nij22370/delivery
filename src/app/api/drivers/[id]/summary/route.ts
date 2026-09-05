import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import DriverProfile from "@/models/DriverProfile";
import { JOB_STATUS } from "@/types/job";
import { DRIVER_PROFILE_STATUS } from "@/types/driverProfile/driverProfile";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { DriverSummaryResponse } from "@/types/drivers/driverDashboard";
import { internalServerError } from "@/lib/apiServerError";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handler(
  _req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id } = await context.params;

    if (user.role !== "admin" && user.userId !== id) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You can only access your own driver summary." },
        { status: 403 }
      );
    }

    const mongoose = (await import("mongoose")).default;
    const objectIdDriver = new mongoose.Types.ObjectId(id);

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

    const [
      activeJobCount,
      completedJobsTotal,
      completedJobsThisMonth,
      totalEarnedResult,
      driverProfile,
    ] = await Promise.all([
      Job.countDocuments({
        driverId: objectIdDriver,
        status: { $in: [JOB_STATUS.ACCEPTED, JOB_STATUS.IN_TRANSIT] },
      }),
      Job.countDocuments({
        driverId: objectIdDriver,
        status: JOB_STATUS.DELIVERED,
      }),
      Job.countDocuments({
        driverId: objectIdDriver,
        status: JOB_STATUS.DELIVERED,
        $or: [
          { deliveredAt: { $gte: startOfMonth } },
          { deliveredAt: null, updatedAt: { $gte: startOfMonth } },
        ],
      }),
      Job.aggregate<{ totalEarned: number }>([
        {
          $match: {
            driverId: objectIdDriver,
            status: JOB_STATUS.DELIVERED,
          },
        },
        {
          $group: {
            _id: null,
            totalEarned: { $sum: "$offeredPrice" },
          },
        },
      ]),
      DriverProfile.findOne({ userId: objectIdDriver }),
    ]);

    const totalEarnedNpr = totalEarnedResult[0]?.totalEarned ?? 0;
    const ratingAvg = driverProfile?.ratingAvg ?? 0;
    const ratingCount = driverProfile?.ratingCount ?? 0;
    const verificationStatus = driverProfile?.status ?? DRIVER_PROFILE_STATUS.UNVERIFIED;

    const responseData: DriverSummaryResponse = {
      success: true,
      data: {
        stats: {
          activeJobCount,
          completedJobsTotal,
          completedJobsThisMonth,
          totalEarnedNpr,
          ratingAvg,
          ratingCount,
          verificationStatus,
        },
      },
    };

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    return internalServerError(error, "drivers/summary");
  }
}

export function GET(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, user) => handler(authenticatedReq, user, context))(req);
}
