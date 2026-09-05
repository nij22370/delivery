import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { SuspendUserResponse, AdminUserRole } from "@/types/admin/adminUsers";
import { internalServerError } from "@/lib/apiServerError";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handler(
  req: NextRequest,
  _user: JwtAccessPayload,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid User ID format" },
        { status: 400 }
      );
    }

    await connectDB();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Critical guard: MUST NOT suspend an admin user
    if (targetUser.role === "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Admin users cannot be suspended.",
        },
        { status: 400 }
      );
    }

    let nextSuspendedState = !targetUser.isSuspended;

    try {
      const body = (await req.json()) as { isSuspended?: boolean };
      if (typeof body.isSuspended === "boolean") {
        nextSuspendedState = body.isSuspended;
      }
    } catch {
      // Body is optional, default to toggle
    }

    targetUser.isSuspended = nextSuspendedState;
    await targetUser.save();

    const response: SuspendUserResponse = {
      success: true,
      message: `User ${nextSuspendedState ? "suspended" : "restored"} successfully`,
      data: {
        _id: targetUser._id.toString(),
        userCode: `USR-${targetUser._id.toString().slice(-4).toUpperCase()}`,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role as AdminUserRole,
        isSuspended: Boolean(targetUser.isSuspended),
        createdAt: new Date(targetUser.createdAt).toISOString(),
        updatedAt: new Date(targetUser.updatedAt).toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return internalServerError(error, "admin/users/suspend");
  }
}

export function PATCH(req: NextRequest, context: RouteContext) {
  return withRole(["admin"])((authenticatedReq, user) =>
    handler(authenticatedReq, user, context)
  )(req);
}
