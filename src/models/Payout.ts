import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type PayoutGateway = "khalti" | "esewa";
export type PayoutStatus = "pending" | "paid" | "failed";

export interface IPayout extends Document {
  driverId: Types.ObjectId;
  jobId: Types.ObjectId;
  amount: number;
  platformFee: number;
  gateway: PayoutGateway;
  gatewayTransactionId: string;
  status: PayoutStatus;
  paidAt?: Date;
  notes?: string;
}

const payoutSchema = new Schema<IPayout>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    platformFee: {
      type: Number,
      required: true,
    },
    gateway: {
      type: String,
      enum: ["khalti", "esewa"],
      required: true,
    },
    gatewayTransactionId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      required: true,
      default: "pending",
    },
    paidAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

const Payout: Model<IPayout> =
  mongoose.models.Payout || mongoose.model<IPayout>("Payout", payoutSchema);

export default Payout;
