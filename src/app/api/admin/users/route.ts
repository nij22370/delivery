import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import type {
  AdminUsersResponse,
  AdminUserItem,
  AdminUserStats,
  AdminUserRole,
} from "@/types/admin/adminUsers";

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
    const roleParam = searchParams.get("role")?.trim().toLowerCase();
    const statusParam = searchParams.get("status")?.trim().toLowerCase();
    const search = searchParams.get("search")?.trim();
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (roleParam && roleParam !== "all") {
      query.role = roleParam;
    }

    if (statusParam === "active") {
      query.isSuspended = { $ne: true };
    } else if (statusParam === "suspended") {
      query.isSuspended = true;
    }

    if (search) {
      const safeSearch = escapeRegex(search).slice(0, MAX_SEARCH_LENGTH);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [
      users,
      total,
      totalUsersCount,
      totalPostersCount,
      totalDriversCount,
      totalSuspendedCount,
    ] = await Promise.all([
      User.find(query)
        .select("-passwordHash -refreshTokenHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
      User.countDocuments({}),
      User.countDocuments({ role: "poster" }),
      User.countDocuments({ role: "driver" }),
      User.countDocuments({ isSuspended: true }),
    ]);

    const data: AdminUserItem[] = users.map((u) => ({
      _id: u._id.toString(),
      userCode: `USR-${u._id.toString().slice(-4).toUpperCase()}`,
      name: u.name,
      email: u.email,
      role: u.role as AdminUserRole,
      isSuspended: Boolean(u.isSuspended),
      createdAt: new Date(u.createdAt).toISOString(),
      updatedAt: new Date(u.updatedAt || u.createdAt).toISOString(),
    }));

    const stats: AdminUserStats = {
      totalUsers: totalUsersCount,
      totalPosters: totalPostersCount,
      totalDrivers: totalDriversCount,
      totalSuspended: totalSuspendedCount,
    };

    const totalPages = Math.ceil(total / limit);

    const response: AdminUsersResponse = {
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
    console.error("Admin users endpoint error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const GET = withRole(["admin"])(handler);
