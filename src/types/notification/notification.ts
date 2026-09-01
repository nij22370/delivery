// notification.ts - Types for the /api/notifications domain.

export const NOTIFICATION_TYPES = [
  "success",
  "error",
  "info",
  "warning",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  message: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface NotificationsQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface MarkNotificationReadResponse {
  message: string;
  notification: Notification;
}

export interface MarkAllReadResponse {
  message: string;
  modifiedCount: number;
}

export const DEFAULT_NOTIFICATIONS_PAGE_SIZE = 20;
export const NOTIFICATIONS_STALE_TIME_MS = 15_000;
