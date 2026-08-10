import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";
import connectDB from "@/lib/db";
import Rating from "@/models/Rating";

async function handleCheckRating(
  req: NextRequest,
  user: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json(
        { message: "jobId query parameter is required" },
        { status: 400 }
      );
    }

    const rating = await Rating.findOne({ jobId, fromUserId: user.userId }).lean();

    return NextResponse.json({ rated: !!rating });
  } catch (error: unknown) {
    console.error("Rating check error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleCheckRating);
