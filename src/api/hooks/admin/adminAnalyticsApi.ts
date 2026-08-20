// adminAnalyticsApi.ts - TanStack Query hooks for admin analytics domain
import { useQuery } from "@tanstack/react-query";
import { getAdminAnalytics } from "../../apis/admin/adminAnalyticsApi";
import type { AdminAnalyticsResponse } from "@/types/admin/adminAnalytics";

export const ADMIN_ANALYTICS_QUERY_KEY = "adminAnalytics";

export function useAdminAnalytics() {
  return useQuery<AdminAnalyticsResponse>({
    queryKey: [ADMIN_ANALYTICS_QUERY_KEY],
    queryFn: getAdminAnalytics,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
