import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";
import { withAuth } from "@/lib/auth";
import { DEFAULT_NOTIFICATIONS_PAGE_SIZE } from "@/types/notification/notification";
import type { JwtAccessPayload } from "@/types/auth/auth";

const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";
const MAX_PAGE_SIZE = 50;

interface GetQuery {
  page: number;
  limit: number;
  unreadOnly: boolean;
}

function parseQuery(url: URL): GetQuery {
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const rawLimit = Number.parseInt(
    url.searchParams.get("limit") ?? String(DEFAULT_NOTIFICATIONS_PAGE_SIZE),
    10
  );
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_NOTIFICATIONS_PAGE_SIZE)
  );
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  return { page, limit, unreadOnly };
}

async function handleGetNotifications(
  req: NextRequest,
  payload: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const { page, limit, unreadOnly } = parseQuery(new URL(req.url));

    const filter = { userId: payload.userId, ...(unreadOnly ? { readAt: null } : {}) };

    const [documents, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: payload.userId, readAt: null }),
    ]);

    return NextResponse.json({
      notifications: documents.map((doc) => ({
        _id: String(doc._id),
        userId: String(doc.userId),
        type: doc.type,
        message: doc.message,
        link: doc.link ?? null,
        readAt: doc.readAt ? doc.readAt.toISOString() : null,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      unreadCount,
    });
  } catch (error: unknown) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetNotifications);
