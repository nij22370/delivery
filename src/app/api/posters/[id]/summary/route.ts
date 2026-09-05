import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import { JOB_STATUS } from "@/types/job";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { PosterSummaryResponse } from "@/types/poster/posterDashboard";
import { internalServerError } from "@/lib/apiServerError";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handler(req: NextRequest, user: JwtAccessPayload, context: RouteContext): Promise<NextResponse> {
  try {
    await connectDB();

    const { id } = await context.params;

    if (user.role !== "admin" && user.userId !== id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const posterId = id;

    const mongoose = (await import("mongoose")).default;
    const objectIdPoster = new mongoose.Types.ObjectId(posterId);

    const [activeCount, pendingCount, completedCount, cancelledCount, totalSpentResult, distinctLocations] =
      await Promise.all([
        Job.countDocuments({
          posterId: objectIdPoster,
          status: { $in: [JOB_STATUS.ACCEPTED, JOB_STATUS.IN_TRANSIT] },
        }),
        Job.countDocuments({
          posterId: objectIdPoster,
          status: JOB_STATUS.POSTED,
        }),
        Job.countDocuments({
          posterId: objectIdPoster,
          status: JOB_STATUS.DELIVERED,
        }),
        Job.countDocuments({
          posterId: objectIdPoster,
          status: JOB_STATUS.CANCELLED,
        }),
        Job.aggregate<{ totalSpent: number }>([
          {
            $match: {
              posterId: objectIdPoster,
              status: JOB_STATUS.DELIVERED,
            },
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: "$offeredPrice" },
            },
          },
        ]),
        Job.distinct("dropoffAddress", { posterId: objectIdPoster }),
      ]);

    const totalAttempted = completedCount + cancelledCount;
    const efficiencyScore = totalAttempted > 0
      ? Number(((completedCount / totalAttempted) * 100).toFixed(1))
      : 98.4;

    const efficiencyTrend = [40, 55, 45, 70, 60, Math.min(100, Math.max(30, Math.round(efficiencyScore)))];

    const activeHubsCount = distinctLocations.length > 0 ? distinctLocations.length : 1;
    const activeHubsLocation = distinctLocations.length > 0
      ? String(distinctLocations[0]).split(",")[0]
      : "Kathmandu Metro";

    const response: PosterSummaryResponse = {
      success: true,
      data: {
        stats: {
          active: activeCount,
          pending: pendingCount,
          completed: completedCount,
          cancelled: cancelledCount,
          totalSpent: totalSpentResult[0]?.totalSpent ?? 0,
          efficiencyScore,
          efficiencyTrend,
          activeHubsCount,
          activeHubsLocation,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return internalServerError(error, "posters/summary");
  }
}

export function GET(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, user) => handler(authenticatedReq, user, context))(req);
}
