import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ILocationPing extends Document {
  jobId: Types.ObjectId;
  driverId: Types.ObjectId;
  lat: number;
  lng: number;
  timestamp: Date;
  expiresAt: Date;
}

const locationPingSchema = new Schema<ILocationPing>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);

// TTL index — MongoDB background job deletes documents after expiresAt passes.
locationPingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for per-job history queries ordered newest-first.
locationPingSchema.index({ jobId: 1, timestamp: -1 });

// Mongoose HMR guard — mirrors User.ts pattern exactly
const LocationPing: Model<ILocationPing> =
  mongoose.models.LocationPing ||
  mongoose.model<ILocationPing>("LocationPing", locationPingSchema);

export default LocationPing;
