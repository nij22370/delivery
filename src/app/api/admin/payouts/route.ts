import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { withRole } from "@/lib/auth";
import connectDB from "@/lib/db";
import Payout from "@/models/Payout";
import Job from "@/models/Job";
import User from "@/models/User";
import { JOB_STATUS } from "@/types/job";
import type { AdminPayoutItem, AdminPayoutsResponse } from "@/types/admin/adminPayouts";
import { internalServerError } from "@/lib/apiServerError";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function handler(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);
    const status = searchParams.get("status")?.trim();
    const driverId = searchParams.get("driverId")?.trim();
    const search = searchParams.get("search")?.trim();
    const gateway = searchParams.get("gateway")?.trim();
    const days = searchParams.get("days")?.trim();
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    if (driverId && Types.ObjectId.isValid(driverId)) {
      query.driverId = new Types.ObjectId(driverId);
    }

    if (gateway) {
      query.gateway = gateway;
    }

    if (days) {
      if (days === "today") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: startOfToday };
      } else if (days !== "all" && days !== "custom") {
        const parsedDays = parseInt(days, 10);
        if (!Number.isNaN(parsedDays)) {
          const dateLimit = new Date();
          dateLimit.setDate(dateLimit.getDate() - parsedDays);
          query.createdAt = { $gte: dateLimit };
        }
      }
    }

    if (search) {
      const matchedDrivers = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id").lean();

      const driverIds = matchedDrivers.map((d) => d._id);
      const orConditions: Record<string, unknown>[] = [
        { driverId: { $in: driverIds } },
      ];

      if (Types.ObjectId.isValid(search)) {
        orConditions.push({ jobId: new Types.ObjectId(search) });
        orConditions.push({ _id: new Types.ObjectId(search) });
      }

      query.$or = orConditions;
    }

    // Calculate start of today for Paid Today stats
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      payouts,
      total,
      pendingAgg,
      activeDisputesCount,
    ] = await Promise.all([
      Payout.find(query)
        .populate<{ driverId: { name: string; email: string } }>("driverId", "name email")
        .populate<{ jobId: string }>("jobId", "_id")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payout.countDocuments(query),
      // Aggregate pending total and count
      Payout.aggregate<{ total: number; count: number }>([
        { $match: { status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      // Active disputes
      Job.countDocuments({ status: JOB_STATUS.DISPUTED }),
    ]);

    // Calculate paid today stats (fallback to all paid payouts if none exist today)
    let paidTodayCount = await Payout.countDocuments({ status: "paid", updatedAt: { $gte: startOfToday } });
    let paidTodayAmount = 0;
    if (paidTodayCount > 0) {
      const paidTodaySum = await Payout.aggregate<{ total: number }>([
        { $match: { status: "paid", updatedAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      paidTodayAmount = paidTodaySum[0]?.total ?? 0;
    } else {
      paidTodayCount = await Payout.countDocuments({ status: "paid" });
      const paidAllSum = await Payout.aggregate<{ total: number }>([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      paidTodayAmount = paidAllSum[0]?.total ?? 0;
    }

    const pendingTotal = pendingAgg[0]?.total ?? 0;
    const pendingCount = pendingAgg[0]?.count ?? 0;

    const data: AdminPayoutItem[] = payouts.map((payout) => {
      const driver = payout.driverId as unknown as { name?: string; email?: string } | null;
      const job = payout.jobId as unknown as { _id?: string } | null;
      const payoutWithTimestamps = payout as unknown as {
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

      return {
        _id: payout._id.toString(),
        jobId: job?._id?.toString() ?? "unknown",
        driverId: payout.driverId.toString(),
        driverName: driver?.name ?? "Unknown Driver",
        driverEmail: driver?.email ?? "",
        amount: payout.amount,
        platformFee: payout.platformFee,
        gateway: payout.gateway,
        gatewayTransactionId: payout.gatewayTransactionId,
        status: payout.status as "pending" | "paid" | "failed",
        paidAt: payoutWithTimestamps.paidAt?.toISOString(),
        note: payout.notes ?? undefined,
        createdAt: toIsoString(payoutWithTimestamps.createdAt),
        updatedAt: toIsoString(payoutWithTimestamps.updatedAt),
      };
    });

    const totalPages = Math.ceil(total / limit);

    const response: AdminPayoutsResponse = {
      success: true,
      data,
      total,
      page,
      limit,
      totalPages,
      summary: {
        pendingTotal,
        pendingCount,
        paidTodayAmount,
        paidTodayCount,
        activeDisputesCount,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return internalServerError(error, "admin/payouts");
  }
}

export const GET = withRole(["admin"])(handler);
