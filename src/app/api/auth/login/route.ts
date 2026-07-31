import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signAccessToken, signRefreshToken, hashToken } from "@/lib/auth";

// ── Constants ────────────────────────────────────────────────────────────────
// A pre-computed bcrypt hash used when a user is not found.
// Running bcrypt.compare against this dummy prevents timing attacks that
// would otherwise let an attacker distinguish "user not found" (fast path)
// from "wrong password" (slow bcrypt path) based on response time.
const DUMMY_PASSWORD_HASH =
  "$2b$10$dummyhashforpreventingtimingattackonuserenumerationfake";

const INVALID_CREDENTIALS_MESSAGE = "Invalid credentials";
const ACCESS_TOKEN_COOKIE = "accessToken";
const REFRESH_TOKEN_COOKIE = "refreshToken";
const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// ── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    const user = await User.findOne({ email });

    // Always run bcrypt.compare — even when user is not found — to ensure
    // both branches take the same amount of time. This prevents an attacker
    // from detecting whether an email is registered via response latency.
    const hashToCompare = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isPasswordValid) {
      return NextResponse.json(
        { message: INVALID_CREDENTIALS_MESSAGE },
        { status: 401 }
      );
    }

    const accessToken = signAccessToken({ userId: String(user._id), role: user.role });
    const refreshToken = signRefreshToken(String(user._id));

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    const response = NextResponse.json(
      { message: "Login successful" },
      { status: 200 }
    );

    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: "/",
    });

    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
