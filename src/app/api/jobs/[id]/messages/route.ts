import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import Message from "@/models/Message";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { Message as MessageDoc, GetMessagesResponse } from "@/types/message/message";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function handleGetMessages(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id: jobId } = await context.params;

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    const isPoster = String(job.posterId) === user.userId;
    const isDriver = job.driverId !== null && String(job.driverId) === user.userId;

    if (!isPoster && !isDriver) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

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

export function GET(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, authenticatedUser) =>
    handleGetMessages(authenticatedReq, authenticatedUser, context)
  )(req);
}
