import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import DriverProfile from "@/models/DriverProfile";
import Job from "@/models/Job";
import { JOB_STATUS } from "@/types/job";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id } = await context.params;

    const user = await User.findById(id).select("name role createdAt phone").lean();
    if (!user) {
      return NextResponse.json({ message: "Driver not found" }, { status: 404 });
    }

    const profile = await DriverProfile.findOne({ userId: id }).lean();

    const totalDeliveries = await Job.countDocuments({
      driverId: id,
      status: JOB_STATUS.DELIVERED,
    });

    return NextResponse.json({ user, profile, totalDeliveries });
  } catch (error: unknown) {
    console.error("Get driver profile error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
