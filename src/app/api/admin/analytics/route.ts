import { NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import Payout from "@/models/Payout";
import DriverProfile from "@/models/DriverProfile";
import { JOB_STATUS } from "@/types/job";
import { DRIVER_PROFILE_STATUS } from "@/types/driverProfile/driverProfile";
import type {
  AdminAnalyticsResponse,
  PaymentMethodBreakdown,
  RecentActivityItem,
} from "@/types/admin/adminAnalytics";
import { internalServerError } from "@/lib/apiServerError";

const THIRTY_DAYS = 29;
const RECENT_ACTIVITY_LIMIT = 6;
const RECENT_VERIFICATIONS_LIMIT = 3;

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

async function handler() {
  try {
    await connectDB();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - THIRTY_DAYS);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      jobsPerDayResult,
      gmvResult,
      activeDriversCount,
      totalJobsDeliveredCount,
      pendingVerificationsCount,
      paymentGatewayResult,
      recentJobs,
      recentVerifications,
    ] = await Promise.all([
      // Jobs per day (last 30 days)
      Job.aggregate<{ date: string; count: number }>([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: "$_id",
            count: 1,
          },
        },
      ]),

      // Total GMV from delivered jobs
      Job.aggregate<{ totalGmv: number }>([
        { $match: { status: JOB_STATUS.DELIVERED } },
        { $group: { _id: null, totalGmv: { $sum: "$offeredPrice" } } },
      ]),

      // Active (approved) drivers
      DriverProfile.countDocuments({ status: DRIVER_PROFILE_STATUS.APPROVED }),

      // Total delivered jobs count
      Job.countDocuments({ status: JOB_STATUS.DELIVERED }),

      // Pending verification requests
      DriverProfile.countDocuments({ status: DRIVER_PROFILE_STATUS.PENDING }),

      // Payment method breakdown from Payout model
      Payout.aggregate<{ _id: string; count: number; totalAmount: number }>([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: "$gateway",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]),

      // Recent jobs for activity feed
      Job.find()
        .sort({ createdAt: -1 })
        .limit(RECENT_ACTIVITY_LIMIT)
        .populate<{ posterId: { name?: string } }>("posterId", "name")
        .lean(),

      // Recent verified drivers for activity feed
      DriverProfile.find({ status: DRIVER_PROFILE_STATUS.APPROVED })
        .sort({ updatedAt: -1 })
        .limit(RECENT_VERIFICATIONS_LIMIT)
        .populate<{ userId: { name?: string } }>("userId", "name")
        .lean(),
    ]);

    // Build payment method breakdown with percentages
    const totalPaidAmount = paymentGatewayResult.reduce(
      (sum, item) => sum + item.totalAmount,
      0
    );
    const paymentMethodBreakdown: PaymentMethodBreakdown[] =
      paymentGatewayResult.map((item) => ({
        gateway: item._id,
        count: item.count,
        totalAmount: item.totalAmount,
        percent:
          totalPaidAmount > 0
            ? Math.round((item.totalAmount / totalPaidAmount) * 100)
            : 0,
      }));

    // Build recent activity from real data
    const recentActivity: RecentActivityItem[] = [];

    for (const job of recentJobs) {
      const shortId = `JB-${job._id.toString().slice(-4).toUpperCase()}`;
      const jobDate = new Date(job.updatedAt || job.createdAt);

      if (job.status === JOB_STATUS.DELIVERED) {
        recentActivity.push({
          id: `act-del-${job._id}`,
          event: "Delivery Completed",
          entityId: shortId,
          status: "Completed",
          statusVariant: "success",
          timeAgo: formatTimeAgo(jobDate),
          icon: "task_alt",
        });
      } else if (job.status === JOB_STATUS.DISPUTED) {
        recentActivity.push({
          id: `act-dis-${job._id}`,
          event: "Dispute Raised",
          entityId: shortId,
          status: "Under Review",
          statusVariant: "warning",
          timeAgo: formatTimeAgo(jobDate),
          icon: "gavel",
        });
      } else if (
        job.paymentStatus === "failed"
      ) {
        recentActivity.push({
          id: `act-fail-${job._id}`,
          event: "Payment Failed",
          entityId: `TRX-${job._id.toString().slice(-3).toUpperCase()}`,
          status: "Failed",
          statusVariant: "error",
          timeAgo: formatTimeAgo(jobDate),
          icon: "credit_card_off",
        });
      } else {
        recentActivity.push({
          id: `act-post-${job._id}`,
          event: "New Job Posted",
          entityId: shortId,
          status:
            job.status === JOB_STATUS.POSTED ? "Pending Match" : "In Progress",
          statusVariant: "neutral",
          timeAgo: formatTimeAgo(new Date(job.createdAt)),
          icon: "local_shipping",
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
        timeAgo: formatTimeAgo(
          new Date(verification.updatedAt || verification.createdAt)
        ),
        icon: "verified",
      });
    }

    // Sort by most recent first (approximation since we don't store absolute timestamps here)
    // The items are already sorted by their respective queries, interleave them as-is

    const response: AdminAnalyticsResponse = {
      jobsPerDay: jobsPerDayResult.map((item) => ({
        date: item.date,
        count: item.count,
      })),
      gmv: gmvResult[0]?.totalGmv ?? 0,
      activeDrivers: activeDriversCount,
      totalJobsDelivered: totalJobsDeliveredCount,
      pendingVerificationsCount,
      paymentMethodBreakdown,
      recentActivity: recentActivity.slice(0, RECENT_ACTIVITY_LIMIT),
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return internalServerError(error, "admin/analytics");
  }
}

export const GET = withRole(["admin"])(handler);
