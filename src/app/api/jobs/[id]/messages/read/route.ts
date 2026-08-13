import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import Message from "@/models/Message";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handleMarkMessagesRead(
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

    const updateResult = await Message.updateMany(
      { jobId, recipientId: user.userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    return NextResponse.json({
      ok: true,
      markedCount: updateResult.modifiedCount,
    });
  } catch (error: unknown) {
    console.error("Mark messages read error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export function PATCH(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, authenticatedUser) =>
    handleMarkMessagesRead(authenticatedReq, authenticatedUser, context)
  )(req);
}
