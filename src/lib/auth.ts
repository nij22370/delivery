import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { JwtAccessPayload, JwtRefreshPayload } from "@/types/auth";

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

export function hashToken(token: string): string {
  return crypto.createHash(HASH_ALGORITHM).update(token).digest("hex");
}
