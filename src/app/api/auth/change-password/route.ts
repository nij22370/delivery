import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";

const BCRYPT_SALT_ROUNDS = 10;
const MIN_NEW_PASSWORD_LENGTH = 8;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(MIN_NEW_PASSWORD_LENGTH, "New password must be at least 8 characters"),
});

const OAUTH_ONLY_MESSAGE = "Password change is not available for OAuth-linked accounts";
const WRONG_CURRENT_PASSWORD_MESSAGE = "Current password is incorrect";
const USER_NOT_FOUND_MESSAGE = "User not found";
const INVALID_INPUT_MESSAGE = "Invalid input";
const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

export const POST = withAuth(async (req: NextRequest, payload: JwtAccessPayload) => {
  try {
    await connectDB();

    const dbUser = await User.findById(payload.userId);

    if (!dbUser) {
      return NextResponse.json({ message: USER_NOT_FOUND_MESSAGE }, { status: 404 });
    }

    if (!dbUser.passwordHash) {
      return NextResponse.json(
        { message: OAUTH_ONLY_MESSAGE },
        { status: 400 }
      );
    }

    const body: unknown = await req.json();

    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: INVALID_INPUT_MESSAGE,
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      dbUser.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: WRONG_CURRENT_PASSWORD_MESSAGE },
        { status: 400 }
      );
    }

    dbUser.passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await dbUser.save();

    return NextResponse.json(
      { message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Change password error:", error);
    const message =
      error instanceof Error ? error.message : INTERNAL_SERVER_ERROR_MESSAGE;
    return NextResponse.json({ message }, { status: 500 });
  }
});
