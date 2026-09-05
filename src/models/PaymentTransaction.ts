import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type { PaymentGateway, TransactionStatus } from "@/types/payments/paymentHistory";

export interface IPaymentTransaction extends Document {
  jobId: Types.ObjectId;
  posterId?: Types.ObjectId;
  gateway: PaymentGateway;
  transactionId: string;
  amount: number;
  status: TransactionStatus;
  processedAt: Date;
}

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    posterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    gateway: {
      type: String,
      enum: ["khalti", "esewa"],
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Completed", "Pending", "Failed", "Expired", "User canceled", "Refunded"],
      required: true,
    },
    processedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ gateway: 1, transactionId: 1 }, { unique: true });
paymentTransactionSchema.index({ posterId: 1, processedAt: -1 });

const PaymentTransaction: Model<IPaymentTransaction> =
  mongoose.models.PaymentTransaction ||
  mongoose.model<IPaymentTransaction>("PaymentTransaction", paymentTransactionSchema);

export default PaymentTransaction;
