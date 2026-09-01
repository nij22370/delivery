import mongoose, { Schema, Document, Model, Types } from "mongoose";
import {
  DRIVER_PROFILE_STATUS,
  DRIVER_VEHICLE_TYPE,
  type DriverProfileStatus,
  type DriverVehicleType,
} from "@/types/driverProfile/driverProfile";

export interface IDriverProfile extends Document {
  userId: Types.ObjectId;
  status: DriverProfileStatus;
  vehicleType: DriverVehicleType;
  phone?: string | null;
  operatingZone?: string | null;
  licenceDocUrl?: string | null;
  governmentIdDocUrl?: string | null;
  insuranceDocUrl?: string | null;
  backgroundCheck: {
    authorized?: boolean;
    authorizedAt?: Date;
  };
  rejectionReason?: string | null;
  verifiedAt?: Date | null;
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const driverProfileSchema = new Schema<IDriverProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    status: {
      type: String,
      enum: Object.values(DRIVER_PROFILE_STATUS),
      required: true,
      default: DRIVER_PROFILE_STATUS.UNVERIFIED,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: Object.values(DRIVER_VEHICLE_TYPE),
      required: true,
      default: DRIVER_VEHICLE_TYPE.BIKE,
    },
    phone: { type: String, default: null },
    operatingZone: { type: String, default: null },
    licenceDocUrl: { type: String, default: null },
    governmentIdDocUrl: { type: String, default: null },
    insuranceDocUrl: { type: String, default: null },
    backgroundCheck: {
      authorized: { type: Boolean, default: false },
      authorizedAt: { type: Date },
    },
    rejectionReason: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

driverProfileSchema.index({ status: 1, createdAt: -1 });

const DriverProfile: Model<IDriverProfile> =
  mongoose.models.DriverProfile ||
  mongoose.model<IDriverProfile>("DriverProfile", driverProfileSchema);

export default DriverProfile;
