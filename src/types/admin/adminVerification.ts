// adminVerification.ts - Types for the admin verification queue domain
import type {
  DriverProfileStatus,
  DriverVehicleType,
} from "@/types/driverProfile/driverProfile";

export type AdminTabKey = Extract<
  DriverProfileStatus,
  "pending" | "approved" | "rejected"
>;

export type ApproveRejectStatus = Extract<
  DriverProfileStatus,
  "approved" | "rejected"
>;

export interface AdminVerificationProfile {
  _id: string;
  userId: string;
  name: string;
  email: string;
  vehicleType: DriverVehicleType;
  status: DriverProfileStatus;
  licenceDocUrl: string | null;
  governmentIdDocUrl: string | null;
  insuranceDocUrl: string | null;
  backgroundCheck: {
    authorized: boolean;
    authorizedAt?: string | null;
  };
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminVerificationQuery {
  status?: DriverProfileStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApproveRejectInput {
  status: ApproveRejectStatus;
  reason?: string;
}

export interface AdminVerificationResponse {
  success: boolean;
  data: AdminVerificationProfile[];
  total: number;
  page: number;
  totalPages: number;
  totalApproved: number;
  totalPending: number;
}

export interface ApproveRejectResponse {
  success: boolean;
  data: AdminVerificationProfile;
}
