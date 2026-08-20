// adminAnalytics.ts - Types for the admin analytics domain

export interface JobsPerDayItem {
  date: string;
  count: number;
}

export interface PaymentMethodBreakdown {
  gateway: string;
  count: number;
  totalAmount: number;
  percent: number;
}

export interface RecentActivityItem {
  id: string;
  event: string;
  entityId: string;
  status: string;
  statusVariant: "success" | "warning" | "error" | "primary" | "neutral";
  timeAgo: string;
  icon: string;
}

export interface AdminAnalyticsResponse {
  jobsPerDay: JobsPerDayItem[];
  gmv: number;
  activeDrivers: number;
  totalJobsDelivered: number;
  pendingVerificationsCount: number;
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  recentActivity: RecentActivityItem[];
}
