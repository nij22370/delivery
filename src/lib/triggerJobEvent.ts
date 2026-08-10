import { pusherServer } from "./pusher";

const PRIVATE_CHANNEL_PREFIX = "private-job-";

export async function triggerJobEvent(
  jobId: string,
  eventName: "location-update" | "new-message" | "status-change",
  payload: Record<string, unknown>
): Promise<void> {
  await pusherServer.trigger(
    `${PRIVATE_CHANNEL_PREFIX}${jobId}`,
    eventName,
    payload
  );
}
