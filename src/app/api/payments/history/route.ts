import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/db";
import PaymentTransaction from "@/models/PaymentTransaction";
import { withAuth } from "@/lib/auth";
import type { JwtAccessPayload } from "@/types/auth/auth";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

async function handleGetPaymentHistory(
  req: NextRequest,
  user: JwtAccessPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const aggregateMode = searchParams.get("aggregate") === "true";

    if (aggregateMode) {
      const result = await PaymentTransaction.aggregate<{
        _id: null;
        totalAmount: number;
        count: number;
      }>([
        { $match: { posterId: new Types.ObjectId(user.userId) } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]);
      const totalAmount =
        result.length > 0 ? Number(result[0].totalAmount.toFixed(2)) : 0;
      const total = result.length > 0 ? result[0].count : 0;
      return NextResponse.json({ totalAmount, total }, { status: 200 });
    }

    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE, MAX_LIMIT);
    const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = { posterId: new Types.ObjectId(user.userId) };

    const [transactions, total] = await Promise.all([
      PaymentTransaction.find(filter)
        .sort({ processedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("jobId", "pickupAddress dropoffAddress offeredPrice paymentStatus paymentGateway")
        .lean(),
      PaymentTransaction.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      { transactions, total, page, totalPages },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Get payment history error:", error);
    return NextResponse.json(
      { message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetPaymentHistory);
