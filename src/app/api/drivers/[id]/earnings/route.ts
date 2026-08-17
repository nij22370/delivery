import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import connectDB from "@/lib/db";
import {
  getAllTimeEarnings,
  getMonthlyEarnings,
  getWeeklyEarnings,
} from "@/lib/earnings";
import type {
  EarningsBreakdownItem,
  EarningsRange,
  EarningsResponse,
} from "@/types/payout/earnings";
import type { JwtAccessPayload } from "@/types/auth/auth";

const DEFAULT_RANGE: EarningsRange = "week";
const ADMIN_ROLE = "admin";
const EARNINGS_RANGES: readonly EarningsRange[] = ["week", "month", "all-time"];

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isEarningsRange(value: string | null): value is EarningsRange {
  return EARNINGS_RANGES.includes(value as EarningsRange);
}

async function handleGetDriverEarnings(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (user.userId !== id && user.role !== ADMIN_ROLE) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const rangeParam = req.nextUrl.searchParams.get("range");
    const range: EarningsRange = isEarningsRange(rangeParam)
      ? rangeParam
      : DEFAULT_RANGE;

    await connectDB();

    const buckets =
      range === "week"
        ? await getWeeklyEarnings(id)
        : range === "month"
          ? await getMonthlyEarnings(id)
          : await getAllTimeEarnings(id);

    const summary = buckets.reduce(
      (acc, bucket) => ({
        totalAmount: acc.totalAmount + bucket.totalAmount,
        jobCount: acc.jobCount + bucket.jobCount,
      }),
      { totalAmount: 0, jobCount: 0 }
    );

    const breakdown: EarningsBreakdownItem[] = buckets.map((bucket) => ({
      period: bucket.period,
      amount: bucket.totalAmount,
      jobCount: bucket.jobCount,
    }));

    const response: EarningsResponse = { summary, breakdown };
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Get driver earnings error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export function GET(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, authenticatedUser) =>
    handleGetDriverEarnings(authenticatedReq, authenticatedUser, context)
  )(req);
}