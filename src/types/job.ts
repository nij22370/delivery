import { z } from "zod";

// ── Enum Constants ────────────────────────────────────────────────────────────
export const JOB_STATUS = {
  POSTED: "posted",
  ACCEPTED: "accepted",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

// Vehicle types match the Stitch Step 2 design exactly (4 options):
// Bicycle/Scooter, Standard Sedan (car), Cargo Van (van), Box Truck (truck).
export const JOB_VEHICLE_TYPE = {
  BICYCLE: "bicycle",
  CAR: "car",
  VAN: "van",
  TRUCK: "truck",
} as const;

export type JobVehicleType = (typeof JOB_VEHICLE_TYPE)[keyof typeof JOB_VEHICLE_TYPE];

// ── Full Creation Schema (Single Source of Truth) ────────────────────────────
// All fields from all steps live here. Step slices are derived via .pick().
// Pickup/Dropoff contact fields come directly from the Stitch Step 1 design.

export const jobCreationSchema = z.object({
  // ── Step 1 fields (Pickup) ──
  pickupAddress: z.string().min(5, "Pickup address must be at least 5 characters"),
  pickupContactName: z.string().min(2, "Contact name must be at least 2 characters"),
  pickupPhone: z.string().min(7, "Please enter a valid phone number"),
  pickupInstructions: z.string().max(500).optional(),

  // ── Step 1 fields (Dropoff) ──
  dropoffAddress: z.string().min(5, "Dropoff address must be at least 5 characters"),
  dropoffContactName: z.string().min(2, "Contact name must be at least 2 characters"),
  dropoffPhone: z.string().min(7, "Please enter a valid phone number"),

  // ── Step 2 fields ──
  vehicleType: z.enum(
    [JOB_VEHICLE_TYPE.BICYCLE, JOB_VEHICLE_TYPE.CAR, JOB_VEHICLE_TYPE.VAN, JOB_VEHICLE_TYPE.TRUCK] as const,
    { error: "Please select a vehicle type" }
  ),

  // ── Step 3 fields ──
  packageDescription: z.string().max(500).optional(),
  offeredPrice: z
    .number()
    .int("Price must be a whole number of cents")
    .positive("Price must be greater than zero"),
  pickupDate: z.string().min(1, "Please select a pickup date"),
  pickupTimeWindow: z.string().min(1, "Please select a time window"),
});

export type JobCreationInput = z.infer<typeof jobCreationSchema>;

// ── Step Slices (derived via .pick — never duplicated) ────────────────────────

export const jobLocationSchema = jobCreationSchema.pick({
  pickupAddress: true,
  pickupContactName: true,
  pickupPhone: true,
  pickupInstructions: true,
  dropoffAddress: true,
  dropoffContactName: true,
  dropoffPhone: true,
});

export type JobLocationInput = z.infer<typeof jobLocationSchema>;

export const jobVehicleSchema = jobCreationSchema.pick({
  vehicleType: true,
});

export type JobVehicleInput = z.infer<typeof jobVehicleSchema>;

export const jobPricingSchema = jobCreationSchema.pick({
  packageDescription: true,
  offeredPrice: true,
  pickupDate: true,
  pickupTimeWindow: true,
});

export type JobPricingInput = z.infer<typeof jobPricingSchema>;
