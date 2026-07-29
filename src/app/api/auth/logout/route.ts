import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

export const POST = withAuth(async (req: NextRequest, payload) => {
  try {
    await connectDB();

    // Revoke the refresh token hash in the database
    // This ensures that even if the cookie wasn't deleted on the client side,
    // the refresh token cannot be used again to get a new access token.
    await User.findByIdAndUpdate(payload.userId, {
      $unset: { refreshTokenHash: 1 },
    });

    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );

    // Clear both cookies by setting maxAge to 0
    response.cookies.set("accessToken", "", {
      maxAge: 0,
      path: "/",
    });
    
    response.cookies.set("refreshToken", "", {
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
});
