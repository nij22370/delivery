// adminDashboardApi.ts - TanStack Query hooks for admin dashboard domain
import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "../../apis/admin/adminDashboardApi";
import type { AdminDashboardResponse } from "@/types/admin/adminDashboard";

export const ADMIN_DASHBOARD_QUERY_KEY = "adminDashboard";

export function useAdminDashboard() {
  return useQuery<AdminDashboardResponse>({
    queryKey: [ADMIN_DASHBOARD_QUERY_KEY],
    queryFn: getAdminDashboard,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
