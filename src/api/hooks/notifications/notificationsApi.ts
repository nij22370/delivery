// notificationsApi.ts - TanStack Query hooks for the /api/notifications domain.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/apis/notifications/notificationsApi";
import type {
  NotificationsQuery,
  NotificationsResponse,
} from "@/types/notification/notification";
import { NOTIFICATIONS_STALE_TIME_MS } from "@/types/notification/notification";

export const NOTIFICATIONS_QUERY_KEY = "notifications";

export function useNotifications(query?: NotificationsQuery) {
  return useQuery<NotificationsResponse, AxiosError>({
    queryKey: [NOTIFICATIONS_QUERY_KEY, query],
    queryFn: () => getNotifications(query),
    staleTime: NOTIFICATIONS_STALE_TIME_MS,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof markNotificationRead>>,
    AxiosError,
    string
  >({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof markAllNotificationsRead>>,
    AxiosError,
    void
  >({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
    },
  });
}
