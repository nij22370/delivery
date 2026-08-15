import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import Payout from "@/models/Payout";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const ERROR_MSG_INTERNAL = "Internal server error";

type PayoutStatus = "pending" | "paid" | "failed";

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveStatusParam(statusParam: string | null): PayoutStatus | null {
  if (statusParam && ["pending", "paid", "failed"].includes(statusParam)) {
    return statusParam as PayoutStatus;
  }
  return null;
}

async function handler(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const status = resolveStatusParam(searchParams.get("status"));
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }

    const [payouts, total] = await Promise.all([
      Payout.find(query)
        .populate<{ driverId: { _id: Types.ObjectId; name: string; email: string } }>(
          "driverId",
          "name email"
        )
        .populate<{ jobId: { _id: Types.ObjectId; offeredPrice: number } }>(
          "jobId",
          "offeredPrice"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payout.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: payouts,
      total,
      page,
      totalPages,
    });
  } catch (error: unknown) {
    console.error("Admin payouts error:", error);
    const message =
      error instanceof Error ? error.message : ERROR_MSG_INTERNAL;
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const GET = withRole(["admin"])(handler);
