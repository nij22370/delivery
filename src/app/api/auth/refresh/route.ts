import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from "@/lib/auth";

// ── Constants ────────────────────────────────────────────────────────────────
const INVALID_TOKEN_MESSAGE = "Invalid or expired refresh token";

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// ── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const validationResult = refreshSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { refreshToken } = validationResult.data;

    // Step 1 — Verify signature and expiry. Throws if invalid or expired.
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json({ message: INVALID_TOKEN_MESSAGE }, { status: 401 });
    }

    // Step 2 — Look up the user and validate the stored hash.
    // If the hash doesn't match, the token was already rotated or was revoked —
    // this is the core of the rotation security guarantee.
    const user = await User.findById(payload.userId);
    const incomingHash = hashToken(refreshToken);

    if (!user || user.refreshTokenHash !== incomingHash) {
      return NextResponse.json({ message: INVALID_TOKEN_MESSAGE }, { status: 401 });
    }

    // Step 3 — Issue new tokens and rotate the stored refresh token hash.
    const newAccessToken = signAccessToken({ userId: String(user._id), role: user.role });
    const newRefreshToken = signRefreshToken(String(user._id));

    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    return NextResponse.json(
      { accessToken: newAccessToken, refreshToken: newRefreshToken },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
