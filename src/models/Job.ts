import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { JOB_STATUS, JOB_VEHICLE_TYPE, type JobStatus, type JobVehicleType } from "@/types/job";

export interface IJob extends Document {
  posterId: Types.ObjectId;
  driverId: Types.ObjectId | null;
  status: JobStatus;
  // Pickup location fields (from Stitch Step 1)
  pickupAddress: string;
  pickupContactName: string;
  pickupPhone: string;
  pickupInstructions?: string;
  // Dropoff location fields (from Stitch Step 1)
  dropoffAddress: string;
  dropoffContactName: string;
  dropoffPhone: string;
  // Vehicle (Step 2)
  vehicleType: JobVehicleType;
  // Pricing (Step 3 — collected Day 16)
  packageDescription?: string;
  offeredPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    posterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      required: true,
      default: JOB_STATUS.POSTED,
      index: true,
    },
    pickupAddress: { type: String, required: true },
    pickupContactName: { type: String, required: true },
    pickupPhone: { type: String, required: true },
    pickupInstructions: { type: String, default: null },
    dropoffAddress: { type: String, required: true },
    dropoffContactName: { type: String, required: true },
    dropoffPhone: { type: String, required: true },
    vehicleType: {
      type: String,
      enum: Object.values(JOB_VEHICLE_TYPE),
      required: true,
    },
    packageDescription: { type: String, default: null },
    offeredPrice: { type: Number, required: true },
  },
  { timestamps: true }
);

// Mongoose HMR guard — mirrors User.ts pattern exactly
const Job: Model<IJob> =
  mongoose.models.Job || mongoose.model<IJob>("Job", jobSchema);

export default Job;
