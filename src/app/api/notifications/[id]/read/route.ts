import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";

const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";
const NOT_FOUND_MESSAGE = "Notification not found";
const INVALID_ID_MESSAGE = "Invalid notification id";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handleMarkRead(
  req: NextRequest,
  payload: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: INVALID_ID_MESSAGE }, { status: 400 });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId: payload.userId },
      { $set: { readAt: new Date() } },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    return NextResponse.json({
      message: "Notification marked as read",
      notification: {
        _id: String(updated._id),
        userId: String(updated.userId),
        type: updated.type,
        message: updated.message,
        link: updated.link ?? null,
        readAt: updated.readAt ? updated.readAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Mark notification read error:", error);
    return NextResponse.json(
      { message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}

export function PATCH(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, authenticatedUser) =>
    handleMarkRead(authenticatedReq, authenticatedUser, context)
  )(req);
}
