// adminDisputes.ts - Types for the admin dispute management domain
import type { JobStatus } from "@/types/job";

export interface DisputedJobItem {
  _id: string;
  jobCode: string;
  status: JobStatus;
  poster: {
    _id: string;
    name: string;
    email: string;
  };
  driver: {
    _id: string;
    name: string;
    email: string;
  } | null;
  disputeReason: string;
  flaggedBy: "poster" | "driver";
  offeredPrice: number;
  pickupAddress: string;
  dropoffAddress: string;
  evidenceImages: string[];
  acceptedAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
  disputedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface DisputesResponse {
  success: boolean;
  data: DisputedJobItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ResolveJobInput {
  resolvedStatus: "posted" | "cancelled";
  note: string;
  payoutStatus?: "paid" | "failed";
}

export interface ResolveJobResponse {
  success: boolean;
  message: string;
  data: DisputedJobItem;
}
