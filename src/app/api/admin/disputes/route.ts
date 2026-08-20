import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import User from "@/models/User";
import { JOB_STATUS } from "@/types/job";
import type {
  DisputesResponse,
  DisputedJobItem,
} from "@/types/admin/adminDisputes";

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
    const search = searchParams.get("search")?.trim();
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      status: JOB_STATUS.DISPUTED,
    };

    if (search) {
      const safeSearch = escapeRegex(search).slice(0, MAX_SEARCH_LENGTH);
      const orConditions: Record<string, unknown>[] = [
        { pickupAddress: { $regex: safeSearch, $options: "i" } },
        { dropoffAddress: { $regex: safeSearch, $options: "i" } },
        { disputeReason: { $regex: safeSearch, $options: "i" } },
      ];

      if (Types.ObjectId.isValid(search)) {
        orConditions.push({ _id: new Types.ObjectId(search) });
      }

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

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate<{ posterId: { _id: Types.ObjectId; name: string; email: string } }>(
          "posterId",
          "name email"
        )
        .populate<{ driverId: { _id: Types.ObjectId; name: string; email: string } }>(
          "driverId",
          "name email"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
    ]);

    const data: DisputedJobItem[] = jobs.map((job) => {
      const poster = job.posterId as unknown as {
        _id: Types.ObjectId;
        name?: string;
        email?: string;
      };
      const driver = job.driverId as unknown as {
        _id: Types.ObjectId;
        name?: string;
        email?: string;
      } | null;

      return {
        _id: job._id.toString(),
        jobCode: `#SWF-${job._id.toString().slice(-4).toUpperCase()}`,
        status: job.status as typeof JOB_STATUS.DISPUTED,
        poster: {
          _id: poster?._id?.toString() ?? "unknown",
          name: poster?.name ?? "Unknown Poster",
          email: poster?.email ?? "",
        },
        driver: driver
          ? {
              _id: driver._id.toString(),
              name: driver.name ?? "Unknown Driver",
              email: driver.email ?? "",
            }
          : null,
        disputeReason: (job as { disputeReason?: string }).disputeReason ?? "",
        flaggedBy: ((job as { flaggedBy?: string }).flaggedBy ?? "poster") as "poster" | "driver",
        offeredPrice: job.offeredPrice,
        pickupAddress: job.pickupAddress,
        dropoffAddress: job.dropoffAddress,
        evidenceImages: (job as { evidenceImages?: string[] }).evidenceImages ?? [],
        acceptedAt: (job as { acceptedAt?: Date }).acceptedAt?.toISOString(),
        inTransitAt: (job as { inTransitAt?: Date }).inTransitAt?.toISOString(),
        deliveredAt: (job as { deliveredAt?: Date }).deliveredAt?.toISOString(),
        disputedAt: (job as { disputedAt?: Date }).disputedAt?.toISOString(),
        createdAt: new Date(job.createdAt).toISOString(),
        updatedAt: new Date(job.updatedAt).toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit);

    const response: DisputesResponse = {
      success: true,
      data,
      total,
      page,
      limit,
      totalPages,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Admin disputes endpoint error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const GET = withRole(["admin"])(handler);
