import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/db";
import User from "@/models/User";
import DriverProfile from "@/models/DriverProfile";
import { withAuth } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";
import {
  adminProfileSchema,
  driverProfileSchema,
  posterProfileSchema,
  type ProfileResponse,
} from "@/types/profile/profile";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { DriverVehicleType } from "@/types/driverProfile/driverProfile";

const INVALID_INPUT_MESSAGE = "Invalid input";
const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";
const NOT_FOUND_MESSAGE = "User not found";
const INVALID_USER_ID_MESSAGE = "Invalid user id";

const vehicleTypeValues = ["bike", "car", "van", "truck"] as const;

const posterUpdateSchema = posterProfileSchema;
const driverUpdateSchema = driverProfileSchema;
const adminUpdateSchema = adminProfileSchema;

interface AllowedUserFields {
  name?: string;
  preferredLanguage?: "en" | "ne";
  phone?: string | null;
  profilePhotoUrl?: string | null;
  defaultPickupAddress?: string | null;
}

interface AllowedDriverFields {
  vehicleType?: DriverVehicleType;
  operatingZone?: string | null;
}

function emptyStringToNull(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value === "" ? null : value;
}

function buildUserResponse(
  user: {
    _id: Types.ObjectId;
    name: string;
    email: string;
    phone?: string | null;
    profilePhotoUrl?: string | null;
    preferredLanguage?: "en" | "ne";
    defaultPickupAddress?: string | null;
    role: "poster" | "driver" | "admin";
  },
  driverFields: { vehicleType?: DriverVehicleType; operatingZone?: string | null } | null
): ProfileResponse {
  const base: ProfileResponse = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    profilePhotoUrl: user.profilePhotoUrl ?? null,
    preferredLanguage: user.preferredLanguage ?? "en",
    defaultPickupAddress: user.defaultPickupAddress ?? null,
    role: user.role,
  };
  if (driverFields) {
    if (driverFields.vehicleType) base.vehicleType = driverFields.vehicleType;
    base.operatingZone = driverFields.operatingZone ?? null;
  }
  return base;
}

function pickPosterFields(input: z.infer<typeof posterUpdateSchema>): AllowedUserFields {
  return {
    name: input.name,
    preferredLanguage: input.preferredLanguage,
    phone: emptyStringToNull(input.phone),
    profilePhotoUrl: emptyStringToNull(input.profilePhotoUrl),
    defaultPickupAddress: emptyStringToNull(input.defaultPickupAddress),
  };
}

function pickAdminFields(input: z.infer<typeof adminUpdateSchema>): AllowedUserFields {
  return {
    name: input.name,
    preferredLanguage: input.preferredLanguage,
  };
}

function pickDriverUserFields(
  input: z.infer<typeof driverUpdateSchema>
): AllowedUserFields {
  return {
    name: input.name,
    preferredLanguage: input.preferredLanguage,
    phone: emptyStringToNull(input.phone),
    profilePhotoUrl: emptyStringToNull(input.profilePhotoUrl),
  };
}

function pickDriverProfileFields(
  input: z.infer<typeof driverUpdateSchema>
): AllowedDriverFields {
  return {
    vehicleType: input.vehicleType,
    operatingZone: emptyStringToNull(input.operatingZone),
  };
}

async function handleGetProfile(
  _req: NextRequest,
  payload: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(payload.userId)) {
      return NextResponse.json({ message: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    const user = await User.findById(payload.userId)
      .select(
        "_id name email phone profilePhotoUrl preferredLanguage defaultPickupAddress role"
      )
      .lean();

    if (!user) {
      return NextResponse.json({ message: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    let driverFields: AllowedDriverFields | null = null;
    if (user.role === "driver") {
      const profile = await DriverProfile.findOne({ userId: user._id })
        .select("vehicleType operatingZone")
        .lean();
      if (profile) {
        driverFields = {
          vehicleType: profile.vehicleType,
          operatingZone: profile.operatingZone ?? null,
        };
      }
    }

    return NextResponse.json(buildUserResponse(user, driverFields));
  } catch (error: unknown) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}

async function handlePatchProfile(
  req: NextRequest,
  payload: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(payload.userId)) {
      return NextResponse.json({ message: INVALID_USER_ID_MESSAGE }, { status: 400 });
    }

    const body: unknown = await req.json();

    let update: AllowedUserFields;
    let driverProfileUpdate: AllowedDriverFields | null = null;

    if (payload.role === "poster") {
      const validation = posterUpdateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: INVALID_INPUT_MESSAGE, errors: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      update = pickPosterFields(validation.data);
    } else if (payload.role === "driver") {
      const validation = driverUpdateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: INVALID_INPUT_MESSAGE, errors: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      update = pickDriverUserFields(validation.data);
      driverProfileUpdate = pickDriverProfileFields(validation.data);
    } else if (payload.role === "admin") {
      const validation = adminUpdateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: INVALID_INPUT_MESSAGE, errors: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      update = pickAdminFields(validation.data);
    } else {
      return NextResponse.json(
        { message: INVALID_INPUT_MESSAGE },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      payload.userId,
      { $set: update },
      { new: true, runValidators: true }
    )
      .select(
        "_id name email phone profilePhotoUrl preferredLanguage defaultPickupAddress role"
      )
      .lean();

    if (!updatedUser) {
      return NextResponse.json({ message: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    let finalDriverFields: AllowedDriverFields | null = null;
    if (payload.role === "driver" && driverProfileUpdate) {
      if (!vehicleTypeValues.includes(driverProfileUpdate.vehicleType as DriverVehicleType)) {
        return NextResponse.json(
          { message: INVALID_INPUT_MESSAGE },
          { status: 400 }
        );
      }
      const updatedProfile = await DriverProfile.findOneAndUpdate(
        { userId: updatedUser._id },
        { $set: driverProfileUpdate },
        { new: true, upsert: true }
      )
        .select("vehicleType operatingZone")
        .lean();
      finalDriverFields = {
        vehicleType: updatedProfile?.vehicleType,
        operatingZone: updatedProfile?.operatingZone ?? null,
      };
    }

    const responseBody = buildUserResponse(updatedUser, finalDriverFields);

    try {
      await notifyUser(payload.userId, "Profile updated successfully", "success");
    } catch (notifyError) {
      console.error("Profile notification failed:", notifyError);
    }

    return NextResponse.json(responseBody);
  } catch (error: unknown) {
    console.error("Patch profile error:", error);
    return NextResponse.json(
      { message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetProfile);
export const PATCH = withAuth(handlePatchProfile);
