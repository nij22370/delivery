import mongoose, { Schema, Document, Model, Types } from "mongoose";

const MIN_SCORE = 1;
const MAX_SCORE = 5;

export interface IRating extends Document {
  jobId: Types.ObjectId;
  fromUserId: Types.ObjectId;
  toUserId: Types.ObjectId;
  score: number;
  comment?: string | null;
  createdAt: Date;
}

const ratingSchema = new Schema<IRating>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: MIN_SCORE,
      max: MAX_SCORE,
    },
    comment: {
      type: String,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ratingSchema.index({ jobId: 1, fromUserId: 1 }, { unique: true });

const Rating: Model<IRating> =
  mongoose.models.Rating ||
  mongoose.model<IRating>("Rating", ratingSchema);

export default Rating;
