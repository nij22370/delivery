import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import Message from "@/models/Message";
import User from "@/models/User";
import { withAuth } from "@/lib/auth";
import { triggerJobEvent } from "@/lib/triggerJobEvent";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { Message as MessageDoc, GetMessagesResponse } from "@/types/message/message";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_CONTENT_LENGTH = 2000;

const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(MAX_CONTENT_LENGTH),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Extract the participant check into a shared helper so GET and POST use the
// same logic and the same error shape.
async function assertParticipant(
  jobId: string,
  userId: string
): Promise<{ posterId: string; driverId: string } | NextResponse> {
  const job = await Job.findById(jobId).lean();
  if (!job) {
    return NextResponse.json({ message: "Job not found" }, { status: 404 });
  }

  const isPoster = String(job.posterId) === userId;
  const isDriver = job.driverId !== null && String(job.driverId) === userId;

  if (!isPoster && !isDriver) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return { posterId: String(job.posterId), driverId: String(job.driverId) };
}

async function handleGetMessages(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id: jobId } = await context.params;

    const participantResult = await assertParticipant(jobId, user.userId);
    if (participantResult instanceof NextResponse) return participantResult;

    const searchParams = req.nextUrl.searchParams;
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const requestedLimit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const query = { jobId };

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
    console.error("Get messages error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

async function handlePostMessage(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id: jobId } = await context.params;

    const participantResult = await assertParticipant(jobId, user.userId);
    if (participantResult instanceof NextResponse) return participantResult;

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

    const { content } = validation.data;
    const { posterId, driverId } = participantResult;
    const recipientId = user.userId === posterId ? driverId : posterId;

    // The sender's display name rides along in the Pusher event so the global
    // notification provider can render "New message from [senderName]".
    const sender = await User.findById(user.userId).select("name").lean();
    const senderName = sender?.name ?? "Unknown";

    // DB write completes BEFORE Pusher fires — no fire-and-forget.
    const savedMessage = await Message.create({
      jobId,
      senderId: user.userId,
      recipientId,
      content,
    });

    await triggerJobEvent(jobId, "new-message", {
      messageId: String(savedMessage._id),
      senderId: user.userId,
      senderName,
      content: savedMessage.content,
      createdAt: savedMessage.createdAt,
    });

    return NextResponse.json({ message: savedMessage }, { status: 201 });
  } catch (error: unknown) {
    console.error("Post message error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export function GET(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, authenticatedUser) =>
    handleGetMessages(authenticatedReq, authenticatedUser, context)
  )(req);
}

export function POST(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, authenticatedUser) =>
    handlePostMessage(authenticatedReq, authenticatedUser, context)
  )(req);
}
