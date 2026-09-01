"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/api/hooks/notifications/notificationsApi";
import type { Notification, NotificationType } from "@/types/notification/notification";
import { getInitials } from "@/utils/format";
import { formatTime } from "@/utils/format";
import { toast } from "sonner";
import { getBackendErrorMessage } from "@/lib/errorResponse";

const PANEL_WIDTH_CLASS = "w-80 sm:w-96";
const PANEL_POSITION_CLASS =
  "absolute right-0 top-12 z-50 rounded-2xl border border-outline-variant " +
  "bg-[var(--color-surface-container-lowest)] shadow-xl overflow-hidden";
const ITEM_BASE_CLASS =
  "flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer border-l-4";
const ITEM_UNREAD_BORDER_COLOR: Record<NotificationType, string> = {
  success: "border-[var(--color-success)]",
  error: "border-[var(--color-error)]",
  warning: "border-[var(--color-warning)]",
  info: "border-[var(--color-primary)]",
};
const ITEM_READ_BORDER_COLOR = "border-transparent";

const TYPE_BADGE_BG: Record<NotificationType, string> = {
  success: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  error: "bg-[var(--color-error)]/15 text-[var(--color-error)]",
  warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  info: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
};
const TYPE_BADGE_LABEL: Record<NotificationType, string> = {
  success: "OK",
  error: "ERR",
  warning: "WARN",
  info: "INFO",
};

const EMPTY_STATE_HEADING = "No notifications yet";
const EMPTY_STATE_BODY = "When something important happens, it'll show up here.";
const PANEL_HEADING = "Notifications";
const MARK_ALL_LABEL = "Mark all as read";
const PANEL_LOAD_ERROR = "Failed to mark notification as read";
const MARK_ALL_ERROR = "Failed to mark all notifications as read";

function getTimestampLabel(notification: Notification): string {
  if (notification.readAt) {
    return `Read ${formatTime(notification.readAt)}`;
  }
  return formatTime(notification.createdAt);
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  const handleItemClick = useCallback(
    (notification: Notification) => {
      if (!notification.readAt) {
        markRead.mutate(notification._id, {
          onError: (error) => {
            toast.error(getBackendErrorMessage(error, PANEL_LOAD_ERROR));
          },
        });
      }
      if (notification.link) {
        onClose();
      }
    },
    [markRead, onClose]
  );

  const handleMarkAll = useCallback(() => {
    if (unreadCount === 0) return;
    markAllRead.mutate(undefined, {
      onError: (error) => {
        toast.error(getBackendErrorMessage(error, MARK_ALL_ERROR));
      },
    });
  }, [markAllRead, unreadCount]);

  const renderItemContent = useCallback(
    (notification: Notification) => (
      <>
        <div
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold ${TYPE_BADGE_BG[notification.type]}`}
        >
          {TYPE_BADGE_LABEL[notification.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-on-surface leading-snug break-words">
            {notification.message}
          </p>
          <p className="text-[11px] text-secondary mt-1">
            {getTimestampLabel(notification)}
          </p>
          {notification.link && (
            <p className="text-[11px] text-primary mt-1 font-semibold">View details →</p>
          )}
        </div>
      </>
    ),
    []
  );

  if (!isOpen) return null;

  return (
    <div ref={containerRef} className={PANEL_POSITION_CLASS + " " + PANEL_WIDTH_CLASS}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
        <h3 className="text-sm font-bold text-on-surface">{PANEL_HEADING}</h3>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0 || markAllRead.isPending}
          className="text-xs font-bold text-primary disabled:text-secondary disabled:cursor-not-allowed hover:underline cursor-pointer"
        >
          {MARK_ALL_LABEL}
        </button>
      </header>

      <div className="max-h-[420px] overflow-y-auto divide-y divide-outline-variant">
        {isLoading ? (
          <div className="px-4 py-6 space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-12 rounded-lg bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary block mb-2">
              notifications_off
            </span>
            <p className="text-sm font-bold text-on-surface">{EMPTY_STATE_HEADING}</p>
            <p className="text-xs text-secondary mt-1">{EMPTY_STATE_BODY}</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const isUnread = !notification.readAt;
            const borderClass = isUnread
              ? ITEM_UNREAD_BORDER_COLOR[notification.type]
              : ITEM_READ_BORDER_COLOR;
            const inner = renderItemContent(notification);
            const baseClass = `${ITEM_BASE_CLASS} ${borderClass} hover:bg-surface-container`;
            if (notification.link) {
              return (
                <Link
                  key={notification._id}
                  href={notification.link}
                  onClick={() => handleItemClick(notification)}
                  className={baseClass}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={notification._id}
                type="button"
                onClick={() => handleItemClick(notification)}
                className={`${baseClass} text-left w-full`}
              >
                {inner}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function useNotificationsBellState() {
  const { data } = useNotifications();
  const unreadCount = useMemo(() => data?.unreadCount ?? 0, [data?.unreadCount]);
  return { unreadCount };
}

export function NotificationsBellIcon() {
  return <span className="material-symbols-outlined text-xl">notifications</span>;
}

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const display = count > 9 ? "9+" : String(count);
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error-red text-white text-[10px] font-bold flex items-center justify-center">
      {display}
    </span>
  );
}

export { getInitials };
