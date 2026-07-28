import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string | null;
  role: "poster" | "driver" | "admin";
  oauthProvider?: string | null;
  oauthId?: string | null;
  refreshTokenHash?: string | null;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, default: null },
    role: {
      type: String,
      enum: ["poster", "driver", "admin"],
      required: true,
      default: "poster",
    },
    oauthProvider: { type: String, default: null },
    oauthId: { type: String, default: null },
    refreshTokenHash: { type: String, default: null },
  },
  { timestamps: true }
);

// Mongoose guard for Next.js dev environment
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
