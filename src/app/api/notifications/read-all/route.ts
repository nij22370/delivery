import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";

const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

async function handleMarkAllRead(
  _req: NextRequest,
  payload: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();
    const result = await Notification.updateMany(
      { userId: payload.userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    return NextResponse.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error: unknown) {
    console.error("Mark all notifications read error:", error);
    return NextResponse.json(
      { message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(handleMarkAllRead);
