import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import { pusherServer } from "@/lib/pusher";

const PRIVATE_JOB_CHANNEL_PREFIX = "private-job-";
const PRIVATE_USER_CHANNEL_PREFIX = "private-user-";

interface AuthBody {
  socket_id: string;
  channel_name: string;
}

function extractJobIdFromChannel(channelName: string): string | null {
  if (!channelName.startsWith(PRIVATE_JOB_CHANNEL_PREFIX)) return null;
  return channelName.slice(PRIVATE_JOB_CHANNEL_PREFIX.length);
}

function extractUserIdFromChannel(channelName: string): string | null {
  if (!channelName.startsWith(PRIVATE_USER_CHANNEL_PREFIX)) return null;
  return channelName.slice(PRIVATE_USER_CHANNEL_PREFIX.length);
}

async function authorizeJobChannel(
  jobId: string,
  user: JwtAccessPayload
): Promise<NextResponse | null> {
  const job = await Job.findById(jobId).lean();
  if (!job) {
    return NextResponse.json({ message: "Job not found" }, { status: 404 });
  }

  const isPoster = String(job.posterId) === user.userId;
  const isDriver =
    job.driverId !== null && String(job.driverId) === user.userId;

  if (!isPoster && !isDriver) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return null;
}

function authorizeUserChannel(
  userId: string,
  user: JwtAccessPayload
): NextResponse | null {
  if (userId !== user.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return null;
}

async function handlePusherAuth(
  req: NextRequest,
  user: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const body: AuthBody = await req.json();
    const { socket_id, channel_name } = body;

    const userChannelId = extractUserIdFromChannel(channel_name);
    if (userChannelId) {
      const denial = authorizeUserChannel(userChannelId, user);
      if (denial) return denial;
    } else {
      const jobId = extractJobIdFromChannel(channel_name);
      if (!jobId) {
        return NextResponse.json(
          { message: "Invalid channel name" },
          { status: 400 }
        );
      }

      const denial = await authorizeJobChannel(jobId, user);
      if (denial) return denial;
    }

    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name);
    return NextResponse.json(authResponse);
  } catch (error: unknown) {
    console.error("Pusher auth error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePusherAuth);
