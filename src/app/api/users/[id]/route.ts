import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Job from "@/models/Job";
import Rating from "@/models/Rating";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";

const NOT_FOUND_MESSAGE = "User not found";
const INVALID_ID_MESSAGE = "Invalid user id";
const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

const SAFE_USER_FIELDS =
  "_id name email role profilePhotoUrl createdAt";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface RatingAggregateRow {
  _id: null;
  average: number | null;
  count: number;
}

async function handleGetUser(
  _req: NextRequest,
  _user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: INVALID_ID_MESSAGE }, { status: 400 });
    }

    const user = await User.findById(id).select(SAFE_USER_FIELDS).lean();
    if (!user) {
      return NextResponse.json({ message: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    const totalJobsPosted = await Job.countDocuments({ posterId: id });

    const [aggregateRow] = await Rating.aggregate<RatingAggregateRow>([
      { $match: { fromUserId: new Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          average: { $avg: "$score" },
          count: { $sum: 1 },
        },
      },
    ]);

    const averageRatingGiven =
      aggregateRow && aggregateRow.count > 0 && aggregateRow.average !== null
        ? Number(aggregateRow.average.toFixed(1))
        : 0;

    return NextResponse.json({
      user,
      totalJobsPosted,
      averageRatingGiven,
    });
  } catch (error: unknown) {
    console.error("Get user profile error:", error);
    return NextResponse.json(
      { message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}

export function GET(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, user) =>
    handleGetUser(authenticatedReq, user, context)
  )(req);
}
