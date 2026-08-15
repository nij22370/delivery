import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import User from "@/models/User";
import { withRole } from "@/lib/auth";
import { initiatePayment } from "@/lib/payments";
import type { JwtAccessPayload } from "@/types/auth/auth";

const initiatePaymentSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  gateway: z.enum(["khalti", "esewa"]),
});

async function handleInitiatePayment(
  req: NextRequest,
  user: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const body = await req.json();
    const parsed = initiatePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { jobId, gateway } = parsed.data;

    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    if (job.posterId.toString() !== user.userId) {
      return NextResponse.json(
        { message: "You are not authorized to pay for this job" },
        { status: 403 }
      );
    }

    if (job.status !== "accepted") {
      return NextResponse.json(
        { message: "Payment can only be initiated for accepted jobs" },
        { status: 400 }
      );
    }

    const poster = await User.findById(user.userId);
    if (!poster) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const result = await initiatePayment(gateway, job, poster);

    if (gateway === "khalti" && result.method === "redirect" && result.pidx) {
      job.paymentPidx = result.pidx;
    }
    
    if (gateway === "khalti") {
      job.paymentGateway = "khalti";
    }
    
    job.paymentStatus = "initiated";
    await job.save();

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to initiate payment";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const POST = withRole(["poster"])(handleInitiatePayment);
