import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import DriverProfile from "@/models/DriverProfile";
import User from "@/models/User";
import { JOB_STATUS } from "@/types/job";
import { DRIVER_PROFILE_STATUS } from "@/types/driverProfile/driverProfile";
import type {
  AdminDashboardResponse,
  AdminRecentActivityItem,
  AdminPlatformGrowthPoint,
} from "@/types/admin/adminDashboard";

const DEFAULT_GROWTH_POINTS: AdminPlatformGrowthPoint[] = [
  { day: "Day 1", valuePercent: 30 },
  { day: "Day 5", valuePercent: 45 },
  { day: "Day 10", valuePercent: 35 },
  { day: "Day 15", valuePercent: 60 },
  { day: "Day 20", valuePercent: 50 },
  { day: "Day 25", valuePercent: 75 },
  { day: "Day 28", valuePercent: 90 },
  { day: "Day 30", valuePercent: 100 },
];

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

async function handler(_req: NextRequest) {
  try {
    await connectDB();

    const [
      gmvResult,
      activeJobsCount,
      activeDriversCount,
      pendingVerificationsCount,
      recentJobs,
      recentVerifications,
    ] = await Promise.all([
      Job.aggregate<{ totalGmv: number }>([
        { $match: { $or: [{ paymentStatus: "paid" }, { status: JOB_STATUS.DELIVERED }] } },
        { $group: { _id: null, totalGmv: { $sum: "$offeredPrice" } } },
      ]),
      Job.countDocuments({
        status: { $in: [JOB_STATUS.POSTED, JOB_STATUS.ACCEPTED, JOB_STATUS.IN_TRANSIT] },
      }),
      DriverProfile.countDocuments({ status: DRIVER_PROFILE_STATUS.APPROVED }),
      DriverProfile.countDocuments({ status: DRIVER_PROFILE_STATUS.PENDING }),
      Job.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate<{ posterId: { name?: string } }>("posterId", "name")
        .lean(),
      DriverProfile.find({ status: DRIVER_PROFILE_STATUS.APPROVED })
        .sort({ updatedAt: -1 })
        .limit(3)
        .populate<{ userId: { name?: string } }>("userId", "name")
        .lean(),
    ]);

    const totalGmvNpr = gmvResult[0]?.totalGmv ?? 0;

    const recentActivity: AdminRecentActivityItem[] = [];

    for (const job of recentJobs) {
      const shortId = `JB-${job._id.toString().slice(-4).toUpperCase()}`;
      if (job.status === JOB_STATUS.DELIVERED) {
        recentActivity.push({
          id: `act-del-${job._id}`,
          event: "Delivery Completed",
          entityId: shortId,
          status: "Delivered",
          statusVariant: "success",
          timeAgo: formatTimeAgo(new Date(job.updatedAt || job.createdAt)),
          icon: "check_circle",
          timestamp: new Date(job.updatedAt || job.createdAt).toISOString(),
        });
      } else if (job.paymentStatus === "failed") {
        recentActivity.push({
          id: `act-fail-${job._id}`,
          event: "Payment Failed",
          entityId: `TRX-${job._id.toString().slice(-4).toUpperCase()}`,
          status: "Failed",
          statusVariant: "error",
          timeAgo: formatTimeAgo(new Date(job.updatedAt || job.createdAt)),
          icon: "error",
          timestamp: new Date(job.updatedAt || job.createdAt).toISOString(),
        });
      } else {
        recentActivity.push({
          id: `act-post-${job._id}`,
          event: "New Job Posted",
          entityId: shortId,
          status: job.status === JOB_STATUS.POSTED ? "Pending Match" : "In Progress",
          statusVariant: "primary",
          timeAgo: formatTimeAgo(new Date(job.createdAt)),
          icon: "add_box",
          timestamp: new Date(job.createdAt).toISOString(),
        });
      }
    }

    for (const verification of recentVerifications) {
      recentActivity.push({
        id: `act-drv-${verification._id}`,
        event: "Driver Verified",
        entityId: `DRV-${verification._id.toString().slice(-3).toUpperCase()}`,
        status: "Approved",
        statusVariant: "success",
        timeAgo: formatTimeAgo(new Date(verification.updatedAt || verification.createdAt)),
        icon: "verified",
        timestamp: new Date(verification.updatedAt || verification.createdAt).toISOString(),
      });
    }

    recentActivity.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const responseBody: AdminDashboardResponse = {
      success: true,
      data: {
        kpis: {
          totalGmvNpr,
          activeJobsCount,
          activeDriversCount,
          pendingVerificationsCount,
          gmvGrowthPercent: 12.5,
          activeJobsGrowthPercent: 5.2,
        },
        recentActivity: recentActivity.slice(0, 6),
        platformGrowth: DEFAULT_GROWTH_POINTS,
      },
    };

    return NextResponse.json(responseBody);
  } catch (error: unknown) {
    console.error("Admin dashboard endpoint error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const GET = withRole(["admin"])(handler);
