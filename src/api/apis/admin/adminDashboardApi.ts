// adminDashboardApi.ts - Plain async functions for admin dashboard domain
import api from "../../api";
import type { AdminDashboardResponse } from "@/types/admin/adminDashboard";

const ADMIN_DASHBOARD_ENDPOINT = "/admin/dashboard";

export async function getAdminDashboard(): Promise<AdminDashboardResponse> {
  const response = await api.get<AdminDashboardResponse>(ADMIN_DASHBOARD_ENDPOINT);
  return response.data;
}
