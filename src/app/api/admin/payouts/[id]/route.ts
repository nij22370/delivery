import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import Payout from "@/models/Payout";
import User from "@/models/User";
import { notifyUser } from "@/lib/notify";
import type { JwtAccessPayload } from "@/types/auth/auth";
import type { PayoutOverrideInput, PayoutOverrideResponse, AdminPayoutItem } from "@/types/admin/adminPayouts";
import { internalServerError } from "@/lib/apiServerError";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handler(
  req: NextRequest,
  _user: JwtAccessPayload,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Payout ID format" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as PayoutOverrideInput;
    const { status, note } = body;

    if (!status || !note) {
      return NextResponse.json(
        { success: false, error: "status and note are required" },
        { status: 400 }
      );
    }

    const allowedStatuses = ["paid", "failed"] as const;
    if (!allowedStatuses.includes(status as "paid" | "failed")) {
      return NextResponse.json(
        { success: false, error: "status must be either paid or failed" },
        { status: 400 }
      );
    }

    await connectDB();

    const payout = await Payout.findById(id).lean();
    if (!payout) {
      return NextResponse.json(
        { success: false, error: "Payout not found" },
        { status: 404 }
      );
    }

    if (payout.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot override payout with status "${payout.status}". Only pending payouts can be updated.`,
        },
        { status: 400 }
      );
    }

    const updatedPayout = await Payout.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          notes: note,
          paidAt: status === "paid" ? new Date() : undefined,
        },
      },
      { new: true }
    ).lean();

    if (!updatedPayout) {
      return NextResponse.json(
        { success: false, error: "Failed to update payout" },
        { status: 500 }
      );
    }

    const driver = await User.findById(updatedPayout.driverId).select("name email").lean();
    const populatedJob = await Payout.findById(updatedPayout._id)
      .populate<{ jobId: { _id: string } }>("jobId", "_id")
      .lean();
    const jobId = (populatedJob?.jobId as unknown as { _id?: string })?._id?.toString() ?? "unknown";

    void notifyUser(
      updatedPayout.driverId.toString(),
      status === "paid"
        ? `Your payout of NPR ${updatedPayout.amount} has been paid.`
        : `Your payout of NPR ${updatedPayout.amount} was marked as failed.`,
      status === "paid" ? "success" : "error",
      { link: "/driver/payouts" }
    );

    const payoutWithTimestamps = updatedPayout as unknown as {
      createdAt?: Date;
      updatedAt?: Date;
      paidAt?: Date;
    };

    const toIsoString = (value: unknown): string => {
      const date = new Date(value as string | number | Date);
      if (Number.isNaN(date.getTime())) {
        return new Date().toISOString();
      }
      return date.toISOString();
    };

    const responseData: AdminPayoutItem = {
      _id: updatedPayout._id.toString(),
      jobId,
      driverId: updatedPayout.driverId.toString(),
      driverName: driver?.name ?? "Unknown Driver",
      driverEmail: driver?.email ?? "",
      amount: updatedPayout.amount,
      platformFee: updatedPayout.platformFee,
      gateway: updatedPayout.gateway,
      gatewayTransactionId: updatedPayout.gatewayTransactionId,
      status: updatedPayout.status as "pending" | "paid" | "failed",
      paidAt: payoutWithTimestamps.paidAt?.toISOString(),
      note: updatedPayout.notes ?? undefined,
      createdAt: toIsoString(payoutWithTimestamps.createdAt),
      updatedAt: toIsoString(payoutWithTimestamps.updatedAt),
    };

    const response: PayoutOverrideResponse = {
      success: true,
      message: `Payout marked as ${status}`,
      data: responseData,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return internalServerError(error, "admin/payouts/id");
  }
}

export function PATCH(req: NextRequest, context: RouteContext) {
  return withRole(["admin"])((authenticatedReq, user) => handler(authenticatedReq, user, context))(req);
}
