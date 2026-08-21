// adminPayouts.ts - Types for the admin payout management domain
import type { PayoutGateway, PayoutStatus } from "@/models/Payout";

export interface AdminPayoutItem {
  _id: string;
  jobId: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  amount: number;
  platformFee: number;
  gateway: PayoutGateway;
  gatewayTransactionId: string;
  status: PayoutStatus;
  paidAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPayoutsQuery {
  page?: number;
  limit?: number;
  status?: PayoutStatus;
  driverId?: string;
  search?: string;
  gateway?: string;
  days?: string;
}

export interface AdminPayoutsSummary {
  pendingTotal: number;
  pendingCount: number;
  paidTodayAmount: number;
  paidTodayCount: number;
  activeDisputesCount: number;
}

export interface AdminPayoutsResponse {
  success: boolean;
  data: AdminPayoutItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: AdminPayoutsSummary;
}

export interface PayoutOverrideInput {
  status: "paid" | "failed";
  note: string;
}

export interface PayoutOverrideResponse {
  success: boolean;
  message: string;
  data: AdminPayoutItem;
}
