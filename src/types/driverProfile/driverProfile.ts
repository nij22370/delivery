import { z } from "zod";

// ── Driver Profile Status Enum ────────────────────────────────────────────────
export const DRIVER_PROFILE_STATUS = {
  UNVERIFIED: "unverified",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type DriverProfileStatus = (typeof DRIVER_PROFILE_STATUS)[keyof typeof DRIVER_PROFILE_STATUS];

// ── Driver Vehicle Type Enum ──────────────────────────────────────────────────
export const DRIVER_VEHICLE_TYPE = {
  BIKE: "bike",
  CAR: "car",
  VAN: "van",
  TRUCK: "truck",
} as const;

export type DriverVehicleType = (typeof DRIVER_VEHICLE_TYPE)[keyof typeof DRIVER_VEHICLE_TYPE];

const DRIVER_PROFILE_STATUS_OPTIONS: [DriverProfileStatus, ...DriverProfileStatus[]] = [
  DRIVER_PROFILE_STATUS.UNVERIFIED,
  DRIVER_PROFILE_STATUS.PENDING,
  DRIVER_PROFILE_STATUS.APPROVED,
  DRIVER_PROFILE_STATUS.REJECTED,
];

const DRIVER_VEHICLE_TYPE_OPTIONS: [DriverVehicleType, ...DriverVehicleType[]] = [
  DRIVER_VEHICLE_TYPE.BIKE,
  DRIVER_VEHICLE_TYPE.CAR,
  DRIVER_VEHICLE_TYPE.VAN,
  DRIVER_VEHICLE_TYPE.TRUCK,
];

// ── Zod Schemas ───────────────────────────────────────────────────────────────

export const driverProfileUpdateSchema = z.object({
  status: z.enum(DRIVER_PROFILE_STATUS_OPTIONS).optional(),
  vehicleType: z.enum(DRIVER_VEHICLE_TYPE_OPTIONS).optional(),
  licenceDocUrl: z.string().url().refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    { message: "Only http/https URLs allowed" }
  ).optional(),
  governmentIdDocUrl: z.string().url().refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    { message: "Only http/https URLs allowed" }
  ).optional(),
  insuranceDocUrl: z.string().url().refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    { message: "Only http/https URLs allowed" }
  ).optional(),
  backgroundCheck: z.object({
    authorized: z.boolean().optional(),
    authorizedAt: z.coerce.date().optional(),
  }).optional(),
  verifiedAt: z.coerce.date().nullable().optional(),
});

export type DriverProfileUpdateInput = z.infer<typeof driverProfileUpdateSchema>;

// ── API Route Types (mirror the API response exactly) ─────────────────────────
export interface DriverProfile {
  _id: string;
  userId: string;
  status: DriverProfileStatus;
  vehicleType: DriverVehicleType;
  licenceDocUrl?: string | null;
  governmentIdDocUrl?: string | null;
  insuranceDocUrl?: string | null;
  backgroundCheck: {
    authorized: boolean;
    authorizedAt?: string | null;
  };
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetDriverVerificationResponse {
  profile: DriverProfile;
}

export interface UpdateDriverVerificationResponse {
  message: string;
  profile: DriverProfile;
}