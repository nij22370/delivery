import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Rating from "@/models/Rating";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id } = await context.params;
    const searchParams = req.nextUrl.searchParams;
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const query = { toUserId: id };

    const [reviews, total] = await Promise.all([
      Rating.find(query)
        .populate("fromUserId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Rating.countDocuments(query),
    ]);

    return NextResponse.json({
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("Get driver reviews error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
