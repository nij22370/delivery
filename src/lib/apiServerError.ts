import { NextResponse } from "next/server";

const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

/**
 * Returns a safe 500 JSON response and logs the actual error server-side.
 * Use this in every API route catch block instead of forwarding error.message
 * to the client, which can expose MongoDB details, stack traces, and paths.
 */
export function internalServerError(
  error: unknown,
  context: string
): NextResponse {
  console.error(`[${context}]`, error);
  return NextResponse.json(
    { message: INTERNAL_SERVER_ERROR_MESSAGE },
    { status: 500 }
  );
}
