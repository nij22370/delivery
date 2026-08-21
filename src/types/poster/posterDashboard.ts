// posterDashboard.ts - Types for the poster dashboard domain

export interface PosterSummaryStats {
  active: number;
  pending: number;
  completed: number;
  cancelled: number;
  totalSpent: number;
  efficiencyScore: number;
  efficiencyTrend: number[];
  activeHubsCount: number;
  activeHubsLocation: string;
}

export interface PosterSummaryData {
  stats: PosterSummaryStats;
}

export interface PosterSummaryResponse {
  success: boolean;
  data: PosterSummaryData;
}
