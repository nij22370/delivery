export interface DriverSummaryStats {
  activeJobCount: number;
  completedJobsTotal: number;
  completedJobsThisMonth: number;
  totalEarnedNpr: number;
  ratingAvg: number;
  ratingCount: number;
  verificationStatus: string;
}

export interface DriverSummaryResponse {
  success: boolean;
  data: {
    stats: DriverSummaryStats;
  };
  error?: string;
}
