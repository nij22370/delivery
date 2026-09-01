"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToUserChannel } from "@/lib/pusherClient";
import type { NotificationPayload, NotificationType } from "@/lib/notify";

const TOAST_DURATION_MS = 5000;

function showToast(payload: NotificationPayload): void {
  const { message, type } = payload;
  switch (type as NotificationType) {
    case "success":
      toast.success(message, { duration: TOAST_DURATION_MS });
      return;
    case "error":
      toast.error(message, { duration: TOAST_DURATION_MS });
      return;
    case "warning":
      toast.warning(message, { duration: TOAST_DURATION_MS });
      return;
    case "info":
    default:
      toast(message, { duration: TOAST_DURATION_MS });
  }
}

export default function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?._id ?? null;
  const subscriptionRef = useRef<ReturnType<
    typeof subscribeToUserChannel
  > | null>(null);

  useEffect(() => {
    if (!userId) {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      return;
    }

    subscriptionRef.current = subscribeToUserChannel(userId, showToast);

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [userId]);

  return <>{children}</>;
}
