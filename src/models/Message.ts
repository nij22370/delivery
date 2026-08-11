import mongoose, { Schema, Document, Model, Types } from "mongoose";

export const MESSAGE_MAX_LENGTH = 2000;

export interface IMessage extends Document {
  jobId: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  content: string;
  readAt: Date | null;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: MESSAGE_MAX_LENGTH,
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Conversation history queries: fetch messages for a job oldest-first.
messageSchema.index({ jobId: 1, createdAt: 1 });

// Unread-count / read-status queries per recipient.
messageSchema.index({ recipientId: 1, readAt: 1 });

// Mongoose HMR guard — mirrors User.ts pattern exactly
const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", messageSchema);

export default Message;
