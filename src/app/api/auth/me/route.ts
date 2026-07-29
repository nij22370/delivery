import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

export const GET = withAuth(async (req: NextRequest, payload) => {
  try {
    await connectDB();

    const user = await User.findById(payload.userId).select("-passwordHash -refreshTokenHash");

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: unknown) {
    console.error("Me route error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
});
