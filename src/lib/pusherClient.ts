import PusherJs from "pusher-js";
import type { Channel } from "pusher-js";
import type { NotificationPayload } from "@/lib/notify";

const PRIVATE_USER_CHANNEL_PREFIX = "private-user-";
const NOTIFICATION_EVENT = "notification";

export const pusherClient = new PusherJs(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  }
);

function getUserChannelName(userId: string): string {
  return `${PRIVATE_USER_CHANNEL_PREFIX}${userId}`;
}

function isNotificationPayload(value: unknown): value is NotificationPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.message === "string" &&
    (candidate.type === "success" ||
      candidate.type === "error" ||
      candidate.type === "info" ||
      candidate.type === "warning")
  );
}

export interface UserChannelSubscription {
  channel: Channel;
  unsubscribe: () => void;
}

export function subscribeToUserChannel(
  userId: string,
  onNotification: (payload: NotificationPayload) => void
): UserChannelSubscription {
  const channelName = getUserChannelName(userId);
  const channel = pusherClient.subscribe(channelName);

  channel.bind(NOTIFICATION_EVENT, (raw: unknown) => {
    if (!isNotificationPayload(raw)) return;
    onNotification(raw);
  });

  return {
    channel,
    unsubscribe: () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    },
  };
}
