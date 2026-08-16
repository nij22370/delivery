import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Payout from "@/models/Payout";
import type { JwtAccessPayload } from "@/types/auth/auth";

async function getDriverPayoutsHandler(
  _req: NextRequest,
  user: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const payouts = await Payout.find({ driverId: user.userId })
      .sort({ createdAt: -1 })
      .populate("jobId", "pickupAddress dropoffAddress offeredPrice status")
      .lean();

    const totalEarned = payouts
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingPayout = payouts
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return NextResponse.json({
      payouts,
      totalEarned,
      pendingPayout,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch driver payouts";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const GET = withAuth(getDriverPayoutsHandler);
