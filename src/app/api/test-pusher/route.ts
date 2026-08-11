import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

const TEST_CHANNEL = "test-channel";
const TEST_EVENT = "test-event";

export async function POST(): Promise<NextResponse> {
  await pusherServer.trigger(TEST_CHANNEL, TEST_EVENT, {
    message: "Hello from the server",
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
