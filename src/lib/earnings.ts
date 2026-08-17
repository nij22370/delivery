import { Types } from "mongoose";
import Payout from "@/models/Payout";
import type { EarningsBucket } from "@/types/payout/earnings";

const DEFAULT_WEEKS = 8;
const DEFAULT_MONTHS = 12;
const PAYOUT_STATUS_PAID = "paid";
const WEEK_START_DAY = "monday";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKLY_PERIOD_FORMAT = "%Y-%m-%d";
const MONTHLY_PERIOD_FORMAT = "%Y-%m";
const DATE_TRUNC_UNIT_WEEK = "week";
const DATE_TRUNC_UNIT_MONTH = "month";

interface EarningsAggregateDoc {
  period: string;
  totalAmount: number;
  jobCount: number;
}

function truncateToWeekStart(date: Date): Date {
  const truncated = new Date(date);
  truncated.setUTCHours(0, 0, 0, 0);
  const daysSinceMonday = truncated.getUTCDay() === 0 ? 6 : truncated.getUTCDay() - 1;
  truncated.setUTCDate(truncated.getUTCDate() - daysSinceMonday);
  return truncated;
}

function truncateToMonthStart(date: Date): Date {
  const truncated = new Date(date);
  truncated.setUTCHours(0, 0, 0, 0);
  truncated.setUTCDate(1);
  return truncated;
}

function subtractWeeks(date: Date, weeks: number): Date {
  return new Date(date.getTime() - weeks * WEEK_MS);
}

function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}

function buildDateTruncSpec(datePath: string, unit: string): Record<string, unknown> {
  const spec: Record<string, unknown> = { date: datePath, unit };
  if (unit === DATE_TRUNC_UNIT_WEEK) {
    spec.startOfWeek = WEEK_START_DAY;
  }
  return spec;
}

async function getEarningsByPeriod(
  driverId: string,
  unit: string,
  periodFormat: string,
  startDate?: Date
): Promise<EarningsBucket[]> {
  const match: Record<string, unknown> = {
    driverId: new Types.ObjectId(driverId),
    status: PAYOUT_STATUS_PAID,
  };
  if (startDate) {
    match.createdAt = { $gte: startDate };
  }

  const result = await Payout.aggregate<EarningsAggregateDoc>([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            date: { $dateTrunc: buildDateTruncSpec("$createdAt", unit) },
            format: periodFormat,
          },
        },
        totalAmount: { $sum: "$amount" },
        jobCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: "$_id", totalAmount: 1, jobCount: 1 } },
  ]);

  return result.map((entry) => ({
    period: entry.period,
    totalAmount: entry.totalAmount,
    jobCount: entry.jobCount,
  }));
}

export async function getWeeklyEarnings(
  driverId: string,
  weeks: number = DEFAULT_WEEKS
): Promise<EarningsBucket[]> {
  const startDate = subtractWeeks(truncateToWeekStart(new Date()), weeks - 1);
  return getEarningsByPeriod(driverId, DATE_TRUNC_UNIT_WEEK, WEEKLY_PERIOD_FORMAT, startDate);
}

export async function getMonthlyEarnings(
  driverId: string,
  months: number = DEFAULT_MONTHS
): Promise<EarningsBucket[]> {
  const startDate = subtractMonths(truncateToMonthStart(new Date()), months - 1);
  return getEarningsByPeriod(driverId, DATE_TRUNC_UNIT_MONTH, MONTHLY_PERIOD_FORMAT, startDate);
}

export async function getAllTimeEarnings(driverId: string): Promise<EarningsBucket[]> {
  return getEarningsByPeriod(driverId, DATE_TRUNC_UNIT_MONTH, MONTHLY_PERIOD_FORMAT);
}
