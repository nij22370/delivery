import { NextResponse } from "next/server";
import connectDB from "@/lib/db";

// Magic constants extraction as per coding standards
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
const DB_READY_STATE_CONNECTED = 1;

const STATUS_OK = "ok";
const STATUS_ERROR = "error";
const DB_STATUS_CONNECTED = "connected";
const DB_STATUS_CONNECTING = "connecting";
const ENV_UNKNOWN = "unknown";
const ERROR_UNKNOWN = "Unknown error occurred";
const LOG_ERROR_MONGO_CONNECTION = "[/api/health] MongoDB connection failed:";

/**
 * GET /api/health
 *
 * Throwaway diagnostic endpoint.
 * Connects to MongoDB and returns a status response.
 * Use this to confirm Atlas is reachable both locally and on Vercel.
 *
 * Expected response:
 *   200 { status: "ok", timestamp: "...", db: "connected" }
 *   500 { status: "error", message: "..." }
 */
export async function GET() {
  try {
    const db = await connectDB();

    return NextResponse.json(
      {
        status: STATUS_OK,
        timestamp: new Date().toISOString(),
        db: db.readyState === DB_READY_STATE_CONNECTED ? DB_STATUS_CONNECTED : DB_STATUS_CONNECTING,
        environment: process.env.NODE_ENV ?? ENV_UNKNOWN,
      },
      { status: HTTP_STATUS_OK }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ERROR_UNKNOWN;

    console.error(LOG_ERROR_MONGO_CONNECTION, message);

    return NextResponse.json(
      {
        status: STATUS_ERROR,
        message,
        timestamp: new Date().toISOString(),
      },
      { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
    );
  }
}
