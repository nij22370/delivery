import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import DriverProfile from "@/models/DriverProfile";
import { driverProfileUpdateSchema, DRIVER_PROFILE_STATUS, DRIVER_VEHICLE_TYPE } from "@/types/driverProfile/driverProfile";
import type { JwtAccessPayload } from "@/types/auth/auth";

async function getHandler(req: NextRequest, user: JwtAccessPayload) {
  try {
    await connectDB();
    const profile = await DriverProfile.findOne({ userId: user.userId }).lean();

    if (!profile) {
      // Handle orphan case: User has driver role but no profile. Return default structure.
      return NextResponse.json({
        profile: {
          status: DRIVER_PROFILE_STATUS.UNVERIFIED,
          vehicleType: DRIVER_VEHICLE_TYPE.BIKE,
          backgroundCheck: { authorized: false },
        },
      });
    }

    return NextResponse.json({ profile });
  } catch (error: unknown) {
    console.error("Get driver verification error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

async function putHandler(req: NextRequest, user: JwtAccessPayload) {
  try {
    await connectDB();
    const body = await req.json();
    const validationResult = driverProfileUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const setQuery: Record<string, unknown> = {};

    if (data.status) setQuery.status = data.status;
    if (data.vehicleType) setQuery.vehicleType = data.vehicleType;
    if (data.licenceDocUrl !== undefined) setQuery.licenceDocUrl = data.licenceDocUrl;
    if (data.governmentIdDocUrl !== undefined) setQuery.governmentIdDocUrl = data.governmentIdDocUrl;
    if (data.insuranceDocUrl !== undefined) setQuery.insuranceDocUrl = data.insuranceDocUrl;

    if (data.backgroundCheck) {
      if (data.backgroundCheck.authorized !== undefined) setQuery["backgroundCheck.authorized"] = data.backgroundCheck.authorized;
      if (data.backgroundCheck.authorizedAt !== undefined) setQuery["backgroundCheck.authorizedAt"] = data.backgroundCheck.authorizedAt;
    }

    // Upsert the profile
    const profile = await DriverProfile.findOneAndUpdate(
      { userId: user.userId },
      { $set: setQuery },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    return NextResponse.json({ message: "Verification updated", profile });
  } catch (error: unknown) {
    console.error("Update driver verification error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const GET = withRole(["driver"])(getHandler);
export const PUT = withRole(["driver"])(putHandler);
