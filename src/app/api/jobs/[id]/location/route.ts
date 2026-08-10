import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import { triggerJobEvent } from "@/lib/triggerJobEvent";

const locationPingSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handleLocationPing(
  req: NextRequest,
  user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectDB();

    const { id: jobId } = await context.params;

    const body: unknown = await req.json();
    const validationResult = locationPingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { lat, lng } = validationResult.data;

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    if (String(job.driverId) !== user.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await triggerJobEvent(jobId, "location-update", {
      lat,
      lng,
      timestamp: new Date().toISOString(),
      driverId: user.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Location ping error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export function POST(req: NextRequest, context: RouteContext) {
  return withAuth((authenticatedReq, user) =>
    handleLocationPing(authenticatedReq, user, context)
  )(req);
}
