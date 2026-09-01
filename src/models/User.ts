import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string | null;
  passwordHash?: string | null;
  role: "poster" | "driver" | "admin";
  oauthProvider?: string | null;
  oauthId?: string | null;
  refreshTokenHash?: string | null;
  isSuspended?: boolean;
  profilePhotoUrl?: string | null;
  preferredLanguage?: "en" | "ne";
  defaultPickupAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: null },
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
    isSuspended: { type: Boolean, default: false },
    profilePhotoUrl: { type: String, default: null },
    preferredLanguage: {
      type: String,
      enum: ["en", "ne"],
      default: "en",
    },
    defaultPickupAddress: { type: String, default: null },
  },
  { timestamps: true }
);

// Mongoose guard for Next.js dev environment
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
