// adminAnalyticsApi.ts - Plain async functions for admin analytics domain
import api from "../../api";
import type { AdminAnalyticsResponse } from "@/types/admin/adminAnalytics";

const ADMIN_ANALYTICS_ENDPOINT = "/admin/analytics";

export async function getAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  const response = await api.get<AdminAnalyticsResponse>(ADMIN_ANALYTICS_ENDPOINT);
  return response.data;
}
