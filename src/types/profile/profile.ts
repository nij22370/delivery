// profile.ts - Zod schemas + response types for the /api/profile endpoint.
// Each role's schema mirrors exactly the fields the API allows the user to
// update for that role. The server enforces this set independently — the
// client schema is here to drive the form, not to gate trust.

import { z } from "zod";
import {
  DRIVER_VEHICLE_TYPE,
  type DriverVehicleType,
} from "@/types/driverProfile/driverProfile";

const MIN_NAME_LENGTH = 2;
const NEPAL_PHONE_REGEX = /^(98|97|96)\d{8}$/;
const NEPAL_PHONE_MESSAGE = "Phone must be a valid Nepal number (10 digits, starts with 98/97/96)";
const PREFERRED_LANGUAGE_OPTIONS = ["en", "ne"] as const;

const preferredLanguageSchema = z.enum(PREFERRED_LANGUAGE_OPTIONS);

const baseProfileSchema = z.object({
  name: z.string().min(MIN_NAME_LENGTH, "Name must be at least 2 characters"),
  preferredLanguage: preferredLanguageSchema,
});

const optionalNepalPhoneSchema = z
  .string()
  .regex(NEPAL_PHONE_REGEX, NEPAL_PHONE_MESSAGE)
  .optional()
  .or(z.literal(""));

const optionalUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal(""));

export const posterProfileSchema = baseProfileSchema.extend({
  phone: optionalNepalPhoneSchema,
  profilePhotoUrl: optionalUrlSchema,
  defaultPickupAddress: z.string().max(500).optional().or(z.literal("")),
});

const vehicleTypeOptions = Object.values(
  DRIVER_VEHICLE_TYPE
) as [DriverVehicleType, ...DriverVehicleType[]];

export const driverProfileSchema = baseProfileSchema.extend({
  phone: optionalNepalPhoneSchema,
  profilePhotoUrl: optionalUrlSchema,
  vehicleType: z.enum(vehicleTypeOptions),
  operatingZone: z.string().max(200).optional().or(z.literal("")),
});

export const adminProfileSchema = baseProfileSchema;

export type PosterProfileInput = z.infer<typeof posterProfileSchema>;
export type DriverProfileInput = z.infer<typeof driverProfileSchema>;
export type AdminProfileInput = z.infer<typeof adminProfileSchema>;

export type ProfileInput =
  | PosterProfileInput
  | DriverProfileInput
  | AdminProfileInput;

export interface ProfileResponse {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  preferredLanguage: "en" | "ne";
  defaultPickupAddress?: string | null;
  vehicleType?: DriverVehicleType;
  operatingZone?: string | null;
  role: "poster" | "driver" | "admin";
}

export const PROFILE_STALE_TIME_MS = 30_000;
