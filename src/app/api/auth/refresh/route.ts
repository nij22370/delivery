import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from "@/lib/auth";

// ── Constants ────────────────────────────────────────────────────────────────
const INVALID_TOKEN_MESSAGE = "Invalid or expired refresh token";
const ACCESS_TOKEN_COOKIE = "accessToken";
const REFRESH_TOKEN_COOKIE = "refreshToken";
const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

// ── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: INVALID_TOKEN_MESSAGE }, { status: 401 });
    }

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

    const response = NextResponse.json(
      { message: "Token refreshed successfully" },
      { status: 200 }
    );

    response.cookies.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: "/",
    });

    response.cookies.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
