import mongoose, { Schema, Document, Model, Types } from "mongoose";
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from "@/types/notification/notification";

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  message: string;
  link?: string | null;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      default: "info",
    },
    message: { type: String, required: true, maxlength: 1000 },
    link: { type: String, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;
