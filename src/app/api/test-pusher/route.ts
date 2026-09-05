import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { withAuth } from "@/lib/auth";

const TEST_CHANNEL = "test-channel";
const TEST_EVENT = "test-event";

async function handler(): Promise<NextResponse> {
  await pusherServer.trigger(TEST_CHANNEL, TEST_EVENT, {
    message: "Hello from the server",
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}

export const POST = withAuth(handler);

