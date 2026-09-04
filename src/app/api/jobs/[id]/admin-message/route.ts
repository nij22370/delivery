import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import Message, { MESSAGE_MAX_LENGTH } from "@/models/Message";
import User from "@/models/User";
import { withRole } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";
import { triggerJobEvent } from "@/lib/triggerJobEvent";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { Message as MessageDoc, GetMessagesResponse } from "@/types/message/message";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

const sendMessageSchema = z.object({
  recipientId: z.string().min(1, "recipientId is required"),
  content: z.string().min(1, "Message cannot be empty").max(MESSAGE_MAX_LENGTH),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function assertRecipientIsParticipant(
  jobId: string,
  recipientId: string
): Promise<boolean> {
  const job = await Job.findById(jobId).select("posterId driverId").lean();
  if (!job) return false;

  return (
    String(job.posterId) === recipientId ||
    (job.driverId !== null && String(job.driverId) === recipientId)
  );
}

async function handleGetAdminMessages(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id: jobId } = await context.params;

    if (!Types.ObjectId.isValid(jobId)) {
      return NextResponse.json(
        { message: "Invalid Job ID format" },
        { status: 400 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const recipientId = searchParams.get("recipientId");
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const requestedLimit = parsePositiveInt(
      searchParams.get("limit"),
      DEFAULT_LIMIT
    );
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { jobId };

    if (recipientId) {
      if (!Types.ObjectId.isValid(recipientId)) {
        return NextResponse.json(
          { message: "Invalid recipientId format" },
          { status: 400 }
        );
      }
      query.$or = [
        { senderId: user.userId, recipientId },
        { senderId: recipientId, recipientId: user.userId },
      ];
    }

    const [total, messages] = await Promise.all([
      Message.countDocuments(query),
      Message.find(query)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean<MessageDoc[]>(),
    ]);

    const totalPages = Math.max(DEFAULT_PAGE, Math.ceil(total / limit));

    const response: GetMessagesResponse = {
      messages,
      total,
      page,
      limit,
      totalPages,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Admin messages GET error:", error);
    return NextResponse.json(
      { message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}

async function handlePostAdminMessage(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id: jobId } = await context.params;

    if (!Types.ObjectId.isValid(jobId)) {
      return NextResponse.json(
        { message: "Invalid Job ID format" },
        { status: 400 }
      );
    }

    const body: unknown = await req.json();
    const validation = sendMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid input",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { recipientId, content } = validation.data;

    if (!Types.ObjectId.isValid(recipientId)) {
      return NextResponse.json(
        { message: "Invalid recipient ID format" },
        { status: 400 }
      );
    }

    const isParticipant = await assertRecipientIsParticipant(
      jobId,
      recipientId
    );
    if (!isParticipant) {
      return NextResponse.json(
        { message: "Recipient is not a participant of this job" },
        { status: 403 }
      );
    }

    const [sender, recipient] = await Promise.all([
      User.findById(user.userId).select("name").lean(),
      User.findById(recipientId).select("name").lean(),
    ]);

    const savedMessage = await Message.create({
      jobId,
      senderId: user.userId,
      recipientId,
      content,
    });

    await triggerJobEvent(jobId, "new-message", {
      messageId: String(savedMessage._id),
      senderId: user.userId,
      senderName: sender?.name ?? "Admin",
      recipientName: recipient?.name ?? "Unknown",
      content: savedMessage.content,
      createdAt: savedMessage.createdAt,
    });

    void notifyUser(
      recipientId,
      `You have a new message from an admin regarding your delivery.`,
      "info",
      { link: `/jobs/${jobId}` }
    );

    return NextResponse.json({ message: savedMessage }, { status: 201 });
  } catch (error: unknown) {
    console.error("Admin message POST error:", error);
    const message =
      error instanceof Error ? error.message : INTERNAL_SERVER_ERROR_MESSAGE;
    return NextResponse.json({ message }, { status: 500 });
  }
}

export function GET(req: NextRequest, context: RouteContext) {
  return withRole(["admin"])(
    (authenticatedReq: NextRequest, user: JwtAccessPayload) =>
      handleGetAdminMessages(authenticatedReq, user, context)
  )(req);
}

export function POST(req: NextRequest, context: RouteContext) {
  return withRole(["admin"])(
    (authenticatedReq: NextRequest, user: JwtAccessPayload) =>
      handlePostAdminMessage(authenticatedReq, user, context)
  )(req);
}
