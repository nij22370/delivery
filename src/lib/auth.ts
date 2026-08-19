import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import connectDB from "@/lib/db";
import User from "@/models/User";
import type { JwtAccessPayload, JwtRefreshPayload } from "@/types/auth/auth";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const HASH_ALGORITHM = "sha256";

const ERROR_MSG_MISSING_ACCESS_SECRET =
  "JWT_ACCESS_SECRET is not defined in environment variables";
const ERROR_MSG_MISSING_REFRESH_SECRET =
  "JWT_REFRESH_SECRET is not defined in environment variables";

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error(ERROR_MSG_MISSING_ACCESS_SECRET);
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error(ERROR_MSG_MISSING_REFRESH_SECRET);
  return secret;
}

export function signAccessToken(payload: JwtAccessPayload): string {
  return jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(userId: string): string {
  const payload: JwtRefreshPayload = { userId };
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  return jwt.verify(token, getRefreshSecret()) as JwtRefreshPayload;
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  return jwt.verify(token, getAccessSecret()) as JwtAccessPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash(HASH_ALGORITHM).update(token).digest("hex");
}

export function withAuth(
  handler: (req: NextRequest, user: JwtAccessPayload) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest) => {
    try {
      const token = req.cookies.get("accessToken")?.value;
      if (!token) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const user = verifyAccessToken(token);

      await connectDB();
      const dbUser = await User.findById(user.userId).select("isSuspended").lean();
      if (!dbUser) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      if (dbUser.isSuspended) {
        return NextResponse.json({ message: "Account is suspended" }, { status: 403 });
      }

      return await handler(req, user);
    } catch (error) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  };
}

type UserRole = JwtAccessPayload["role"];

export function withRole(allowedRoles: UserRole[]) {
  return function (
    handler: (req: NextRequest, user: JwtAccessPayload) => Promise<NextResponse> | NextResponse
  ) {
    return withAuth(async (req, user) => {
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
      return handler(req, user);
    });
  };
}
