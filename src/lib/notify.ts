// notify.ts - Server-side helper for sending user-channel notifications.
// notifyUser is the ONLY entry point allowed to trigger Pusher events on
// private-user-{userId}. It also persists a Notification row so the bell icon
// can show a persistent inbox in addition to the transient sonner toast.

import connectDB from "@/lib/db";
import Notification from "@/models/Notification";
import { pusherServer } from "@/lib/pusher";

const PRIVATE_USER_CHANNEL_PREFIX = "private-user-";
const NOTIFICATION_EVENT = "notification";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface NotificationPayload {
  message: string;
  type: NotificationType;
}

export interface NotifyUserOptions {
  link?: string;
}

export async function notifyUser(
  userId: string,
  message: string,
  type: NotificationType,
  options: NotifyUserOptions = {}
): Promise<void> {
  let notificationId: string | null = null;

  try {
    await connectDB();
    const created = await Notification.create({
      userId,
      type,
      message,
      link: options.link ?? null,
    });
    notificationId = String(created._id);
  } catch (error) {
    console.error("notifyUser persist error:", error);
  }

  const payload: NotificationPayload & { notificationId: string | null } = {
    message,
    type,
    notificationId,
  };

  try {
    await pusherServer.trigger(
      `${PRIVATE_USER_CHANNEL_PREFIX}${userId}`,
      NOTIFICATION_EVENT,
      payload
    );
  } catch (error) {
    console.error("notifyUser pusher trigger error:", error);
  }
}
