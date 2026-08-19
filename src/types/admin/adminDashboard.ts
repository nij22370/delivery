// adminDashboard.ts - Types for the admin platform overview dashboard domain

export interface AdminDashboardKPIs {
  totalGmvNpr: number;
  activeJobsCount: number;
  activeDriversCount: number;
  pendingVerificationsCount: number;
  gmvGrowthPercent: number;
  activeJobsGrowthPercent: number;
}

export type ActivityEvent =
  | "New Job Posted"
  | "Driver Verified"
  | "Payment Failed"
  | "Delivery Completed";

export type ActivityStatusVariant = "primary" | "success" | "error" | "neutral" | "warning";

export interface AdminRecentActivityItem {
  id: string;
  event: ActivityEvent;
  entityId: string;
  status: string;
  statusVariant: ActivityStatusVariant;
  timeAgo: string;
  icon: string;
  timestamp: string;
}

export interface AdminPlatformGrowthPoint {
  day: string;
  valuePercent: number;
}

export interface AdminDashboardData {
  kpis: AdminDashboardKPIs;
  recentActivity: AdminRecentActivityItem[];
  platformGrowth: AdminPlatformGrowthPoint[];
}

export interface AdminDashboardResponse {
  success: boolean;
  data: AdminDashboardData;
}
