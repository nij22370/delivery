import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";
import { internalServerError } from "@/lib/apiServerError";

type UnreadCountsByJob = Record<string, number>;

async function handleGetUnreadCounts(
  req: NextRequest,
  user: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const rows = await Message.aggregate([
      {
        $match: {
          recipientId: new Types.ObjectId(user.userId),
          readAt: null,
        },
      },
      {
        $group: {
          _id: "$jobId",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts: UnreadCountsByJob = {};
    rows.forEach((row) => {
      counts[String(row._id)] = row.count;
    });

    return NextResponse.json(counts);
  } catch (error: unknown) {
    return internalServerError(error, "jobs/unread-counts");
  }
}

export const GET = withAuth(handleGetUnreadCounts);
