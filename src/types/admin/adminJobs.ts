// adminJobs.ts - Types for the admin job management domain
import type { JobStatus, JobVehicleType } from "@/types/job";

export interface AdminJobPoster {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface AdminJobDriver {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  ratingAvg?: number;
  ratingCount?: number;
}

export interface AdminJobItem {
  _id: string;
  jobCode: string;
  status: JobStatus;
  poster: AdminJobPoster;
  driver: AdminJobDriver | null;
  pickupAddress: string;
  pickupContactName: string;
  pickupPhone: string;
  dropoffAddress: string;
  dropoffContactName: string;
  dropoffPhone: string;
  vehicleType: JobVehicleType;
  packageDescription?: string | null;
  offeredPrice: number; // in NPR
  pickupDate: string;
  pickupTimeWindow: string;
  paymentStatus?: "initiated" | "paid" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface AdminJobStats {
  totalActive: number;
  inTransit: number;
  disputed: number;
  totalRevenueNpr: number;
}

export interface AdminJobsQuery {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "offeredPrice" | "status" | "pickupDate";
  sortOrder?: "asc" | "desc";
}

export interface AdminJobsResponse {
  success: boolean;
  data: AdminJobItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: AdminJobStats;
}

export type AllowedOverrideStatus = "cancelled" | "posted";

export interface StatusOverrideInput {
  status: AllowedOverrideStatus;
  reason?: string;
}

export interface StatusOverrideResponse {
  success: boolean;
  message?: string;
  data: AdminJobItem;
}
