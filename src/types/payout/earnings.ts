export type EarningsRange = "week" | "month" | "all-time";

export interface EarningsBucket {
  period: string;
  totalAmount: number;
  jobCount: number;
}

export interface EarningsSummary {
  totalAmount: number;
  jobCount: number;
}

export interface EarningsBreakdownItem {
  period: string;
  amount: number;
  jobCount: number;
}

export interface EarningsResponse {
  summary: EarningsSummary;
  breakdown: EarningsBreakdownItem[];
}
