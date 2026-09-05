import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import User from "@/models/User";
import DriverProfile from "@/models/DriverProfile";
import { JOB_STATUS, type JobStatus } from "@/types/job";
import type {
  AdminJobsResponse,
  AdminJobItem,
  AdminJobStats,
} from "@/types/admin/adminJobs";
import { internalServerError } from "@/lib/apiServerError";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_SEARCH_LENGTH = 100;
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(input: string): string {
  return input.replace(REGEX_SPECIAL_CHARS, "\\$&");
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function handler(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const statusParam = searchParams.get("status")?.trim().toLowerCase();
    const search = searchParams.get("search")?.trim();
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);
    const sortBy = searchParams.get("sortBy")?.trim() || "createdAt";
    const sortOrder = searchParams.get("sortOrder")?.trim().toLowerCase() === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (statusParam && statusParam !== "all") {
      query.status = statusParam;
    }

    if (search) {
      const safeSearch = escapeRegex(search).slice(0, MAX_SEARCH_LENGTH);
      const orConditions: Record<string, unknown>[] = [
        { pickupAddress: { $regex: safeSearch, $options: "i" } },
        { dropoffAddress: { $regex: safeSearch, $options: "i" } },
        { pickupContactName: { $regex: safeSearch, $options: "i" } },
        { dropoffContactName: { $regex: safeSearch, $options: "i" } },
      ];

      if (Types.ObjectId.isValid(search)) {
        orConditions.push({ _id: new Types.ObjectId(search) });
      }

      // Also search users matching name/email
      const matchedUsers = await User.find({
        $or: [
          { name: { $regex: safeSearch, $options: "i" } },
          { email: { $regex: safeSearch, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      if (matchedUsers.length > 0) {
        const userIds = matchedUsers.map((u) => u._id);
        orConditions.push({ posterId: { $in: userIds } });
        orConditions.push({ driverId: { $in: userIds } });
      }

      query.$or = orConditions;
    }

    const sortOption: Record<string, 1 | -1> = {
      [sortBy]: sortOrder,
    };

    const [
      jobs,
      total,
      totalActiveCount,
      inTransitCount,
      disputedCount,
      revenueResult,
    ] = await Promise.all([
      Job.find(query)
        .populate<{ posterId: { _id: Types.ObjectId; name: string; email: string; role: string } }>(
          "posterId",
          "name email role"
        )
        .populate<{ driverId: { _id: Types.ObjectId; name: string; email: string; role: string } }>(
          "driverId",
          "name email role"
        )
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
      Job.countDocuments({
        status: { $in: [JOB_STATUS.POSTED, JOB_STATUS.ACCEPTED, JOB_STATUS.IN_TRANSIT] },
      }),
      Job.countDocuments({ status: JOB_STATUS.IN_TRANSIT }),
      Job.countDocuments({ status: { $in: ["disputed", JOB_STATUS.CANCELLED] } }),
      Job.aggregate<{ totalRevenue: number }>([
        { $match: { $or: [{ paymentStatus: "paid" }, { status: JOB_STATUS.DELIVERED }] } },
        { $group: { _id: null, totalRevenue: { $sum: "$offeredPrice" } } },
      ]),
    ]);

    // Fetch driver profile ratings for assigned drivers
    const driverIds = jobs
      .map((j) => (j.driverId ? (j.driverId as unknown as { _id: Types.ObjectId })._id : null))
      .filter((id): id is Types.ObjectId => Boolean(id));

    const driverProfiles = await DriverProfile.find({ userId: { $in: driverIds } })
      .select("userId ratingAvg ratingCount")
      .lean();

    const profileByUserId = new Map<string, { ratingAvg?: number; ratingCount?: number }>();
    for (const dp of driverProfiles) {
      profileByUserId.set(dp.userId.toString(), {
        ratingAvg: dp.ratingAvg,
        ratingCount: dp.ratingCount,
      });
    }

    const data: AdminJobItem[] = jobs.map((job) => {
      const poster = job.posterId as unknown as {
        _id: Types.ObjectId;
        name?: string;
        email?: string;
        role?: string;
      };
      const driver = job.driverId as unknown as {
        _id: Types.ObjectId;
        name?: string;
        email?: string;
        role?: string;
      } | null;

      const driverProfile = driver ? profileByUserId.get(driver._id.toString()) : undefined;

      return {
        _id: job._id.toString(),
        jobCode: `#SWF-${job._id.toString().slice(-4).toUpperCase()}`,
        status: job.status as JobStatus,
        poster: {
          _id: poster?._id?.toString() ?? "unknown",
          name: poster?.name ?? "Unknown Poster",
          email: poster?.email ?? "",
          role: poster?.role ?? "poster",
        },
        driver: driver
          ? {
              _id: driver._id.toString(),
              name: driver.name ?? "Unknown Driver",
              email: driver.email ?? "",
              ratingAvg: driverProfile?.ratingAvg ?? 5.0,
              ratingCount: driverProfile?.ratingCount ?? 0,
            }
          : null,
        pickupAddress: job.pickupAddress,
        pickupContactName: job.pickupContactName,
        pickupPhone: job.pickupPhone,
        dropoffAddress: job.dropoffAddress,
        dropoffContactName: job.dropoffContactName,
        dropoffPhone: job.dropoffPhone,
        vehicleType: job.vehicleType,
        packageDescription: job.packageDescription,
        offeredPrice: job.offeredPrice,
        pickupDate: job.pickupDate,
        pickupTimeWindow: job.pickupTimeWindow,
        paymentStatus: job.paymentStatus,
        createdAt: new Date(job.createdAt).toISOString(),
        updatedAt: new Date(job.updatedAt || job.createdAt).toISOString(),
      };
    });

    const stats: AdminJobStats = {
      totalActive: totalActiveCount,
      inTransit: inTransitCount,
      disputed: disputedCount,
      totalRevenueNpr: revenueResult[0]?.totalRevenue ?? 0,
    };

    const totalPages = Math.ceil(total / limit);

    const response: AdminJobsResponse = {
      success: true,
      data,
      total,
      page,
      limit,
      totalPages,
      stats,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return internalServerError(error, "admin/jobs");
  }
}

export const GET = withRole(["admin"])(handler);
