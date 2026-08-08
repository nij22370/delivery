import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withRole } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";
import connectDB from "@/lib/db";
import DriverProfile from "@/models/DriverProfile";
import { DRIVER_PROFILE_STATUS } from "@/types/driverProfile/driverProfile";
import type { AdminVerificationProfile } from "@/types/admin/adminVerification";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const reviewSchema = z.object({
  status: z.enum([
    DRIVER_PROFILE_STATUS.APPROVED,
    DRIVER_PROFILE_STATUS.REJECTED,
  ]),
  reason: z.string().optional(),
});

async function handleReview(
  req: NextRequest,
  _user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id } = await context.params;
    const body = await req.json();

    const validationResult = reviewSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const update: Record<string, unknown> = {
      status: data.status,
    };
    if (data.status === DRIVER_PROFILE_STATUS.REJECTED) {
      update.rejectionReason = data.reason ?? null;
      update.verifiedAt = null;
    } else {
      update.rejectionReason = null;
      update.verifiedAt = new Date();
    }

    const updatedProfile = await DriverProfile.findOneAndUpdate(
      { _id: id, status: DRIVER_PROFILE_STATUS.PENDING },
      { $set: update },
      { new: true }
    ).lean();

    if (!updatedProfile) {
      return NextResponse.json(
        { success: false, error: "Profile is not pending" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile as unknown as AdminVerificationProfile,
    });
  } catch (error: unknown) {
    console.error("Admin verification review error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export function PATCH(req: NextRequest, context: RouteContext) {
  return withRole(["admin"])((authenticatedReq, user) =>
    handleReview(authenticatedReq, user, context)
  )(req);
}
