import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import Payout from "@/models/Payout";
import { Types } from "mongoose";

const ERROR_MSG_INTERNAL = "Internal server error";
const ERROR_MSG_NOT_FOUND = "Payout not found";
const ERROR_MSG_INVALID_STATUS = "Invalid status transition";

interface PayoutUpdateBody {
  status: "paid";
  notes?: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handler(req: NextRequest, _user: import("@/types/auth/auth").JwtAccessPayload, context: RouteContext) {
  try {
    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: ERROR_MSG_NOT_FOUND },
        { status: 404 }
      );
    }

    const body = (await req.json()) as PayoutUpdateBody;
    const { status, notes } = body;

    if (status !== "paid") {
      return NextResponse.json(
        { success: false, error: ERROR_MSG_INVALID_STATUS },
        { status: 400 }
      );
    }

    const payout = await Payout.findById(id);
    if (!payout) {
      return NextResponse.json(
        { success: false, error: ERROR_MSG_NOT_FOUND },
        { status: 404 }
      );
    }

    if (payout.status === "paid") {
      return NextResponse.json(
        { success: false, error: "Payout already paid" },
        { status: 400 }
      );
    }

    if (payout.status === "failed") {
      return NextResponse.json(
        { success: false, error: "Cannot mark failed payout as paid" },
        { status: 400 }
      );
    }

    payout.status = "paid";
    payout.paidAt = new Date();
    if (notes) {
      payout.notes = notes;
    }

    await payout.save();

    return NextResponse.json({
      success: true,
      data: payout,
    });
  } catch (error: unknown) {
    console.error("Admin payout update error:", error);
    const message =
      error instanceof Error ? error.message : ERROR_MSG_INTERNAL;
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export function PATCH(req: NextRequest, context: RouteContext) {
  return withRole(["admin"])((authenticatedReq, user) =>
    handler(authenticatedReq, user, context)
  )(req);
}