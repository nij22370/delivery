// notificationsApi.ts - Plain async functions for the /api/notifications domain.
import api from "@/api/api";
import type {
  MarkAllReadResponse,
  MarkNotificationReadResponse,
  NotificationsQuery,
  NotificationsResponse,
} from "@/types/notification/notification";
import { DEFAULT_NOTIFICATIONS_PAGE_SIZE } from "@/types/notification/notification";

const NOTIFICATIONS_ENDPOINT = "/notifications";

function buildQueryParams(query: NotificationsQuery | undefined): URLSearchParams {
  const params = new URLSearchParams();
  if (!query) {
    params.set("page", "1");
    params.set("limit", String(DEFAULT_NOTIFICATIONS_PAGE_SIZE));
    return params;
  }
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.unreadOnly) params.set("unreadOnly", "true");
  return params;
}

export async function getNotifications(
  query?: NotificationsQuery
): Promise<NotificationsResponse> {
  const response = await api.get<NotificationsResponse>(
    `${NOTIFICATIONS_ENDPOINT}?${buildQueryParams(query)}`
  );
  return response.data;
}

export async function markNotificationRead(
  notificationId: string
): Promise<MarkNotificationReadResponse> {
  const response = await api.patch<MarkNotificationReadResponse>(
    `${NOTIFICATIONS_ENDPOINT}/${notificationId}/read`
  );
  return response.data;
}

export async function markAllNotificationsRead(): Promise<MarkAllReadResponse> {
  const response = await api.patch<MarkAllReadResponse>(
    `${NOTIFICATIONS_ENDPOINT}/read-all`
  );
  return response.data;
}
