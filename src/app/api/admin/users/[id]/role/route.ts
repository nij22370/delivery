import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { ChangeUserRoleResponse, AdminUserRole } from "@/types/admin/adminUsers";
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

    const body = (await req.json()) as { role?: string };
    const newRole = body.role?.trim().toLowerCase();

    if (!newRole) {
      return NextResponse.json(
        { success: false, error: "New role is required" },
        { status: 400 }
      );
    }

    // Critical guard: Admin role MUST NOT be assignable via this endpoint
    if (newRole === "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Admin role cannot be assigned via this endpoint. Only 'poster' and 'driver' roles are permitted.",
        },
        { status: 400 }
      );
    }

    if (newRole !== "poster" && newRole !== "driver") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid role. Role must be either 'poster' or 'driver'.",
        },
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

    // Critical guard: MUST NOT modify the role of an admin user
    if (targetUser.role === "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot change the role of an admin user.",
        },
        { status: 400 }
      );
    }

    targetUser.role = newRole as "poster" | "driver";
    await targetUser.save();

    const response: ChangeUserRoleResponse = {
      success: true,
      message: `User role successfully updated to ${newRole}`,
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
    return internalServerError(error, "admin/users/role");
  }
}

export function PATCH(req: NextRequest, context: RouteContext) {
  return withRole(["admin"])((authenticatedReq, user) =>
    handler(authenticatedReq, user, context)
  )(req);
}
