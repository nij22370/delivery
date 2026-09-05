import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import DriverProfile from "@/models/DriverProfile";
import User from "@/models/User";
import { DRIVER_PROFILE_STATUS } from "@/types/driverProfile/driverProfile";
import type { DriverProfileStatus } from "@/types/driverProfile/driverProfile";
import type { AdminVerificationProfile } from "@/types/admin/adminVerification";
import { internalServerError } from "@/lib/apiServerError";

// ── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const ERROR_MSG_INTERNAL = "Internal server error";

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveStatusParam(statusParam: string | null): DriverProfileStatus {
  if (
    statusParam &&
    (Object.values(DRIVER_PROFILE_STATUS) as string[]).includes(statusParam)
  ) {
    return statusParam as DriverProfileStatus;
  }
  return DRIVER_PROFILE_STATUS.PENDING;
}

const MAX_SEARCH_LENGTH = 100;
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(input: string): string {
  return input.replace(REGEX_SPECIAL_CHARS, "\\$&");
}

async function handler(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const status = resolveStatusParam(searchParams.get("status"));
    const search = searchParams.get("search")?.trim();
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { status };

    if (search) {
      const safeSearch = escapeRegex(search).slice(0, MAX_SEARCH_LENGTH);
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: safeSearch, $options: "i" } },
          { email: { $regex: safeSearch, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();
      const userIds = matchingUsers.map((user) => user._id);
      query.userId = { $in: userIds };
    }

    const [profiles, total, totalApproved, totalPending, totalRejected] = await Promise.all([
      DriverProfile.find(query)
        .populate<{ userId: { _id: Types.ObjectId; name: string; email: string } }>(
          "userId",
          "name email"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DriverProfile.countDocuments(query),
      DriverProfile.countDocuments({ status: DRIVER_PROFILE_STATUS.APPROVED }),
      DriverProfile.countDocuments({ status: DRIVER_PROFILE_STATUS.PENDING }),
      DriverProfile.countDocuments({ status: DRIVER_PROFILE_STATUS.REJECTED }),
    ]);

    const data: AdminVerificationProfile[] = profiles
      .filter((profile) => Boolean(profile.userId))
      .map((profile) => {
        const user = profile.userId as unknown as {
          _id?: Types.ObjectId;
          name?: string;
          email?: string;
        } | null;
        return {
          ...profile,
          userId: user?._id ? user._id.toString() : "unknown",
          name: user?.name ?? "Unknown",
          email: user?.email ?? "Unknown",
        } as unknown as AdminVerificationProfile;
      });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      totalPages,
      totalApproved,
      totalPending,
      totalRejected,
    });
  } catch (error: unknown) {
    return internalServerError(error, "admin/verification");
  }
}

export const GET = withRole(["admin"])(handler);
