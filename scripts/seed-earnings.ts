import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Payout from "../src/models/Payout";
import Job from "../src/models/Job";
import User from "../src/models/User";
import {
  getAllTimeEarnings,
  getMonthlyEarnings,
  getWeeklyEarnings,
} from "../src/lib/earnings";

const SEED_DRIVER_EMAILS = [
  "earnings.driver.a@example.com",
  "earnings.driver.b@example.com",
  "earnings.driver.c@example.com",
];
const SEED_POSTER_EMAIL = "earnings.poster@example.com";
const DRIVER_ROLE = "driver";
const POSTER_ROLE = "poster";
const JOB_STATUS_DELIVERED = "delivered";
const JOB_VEHICLE_BICYCLE = "bicycle";
const PAYOUT_STATUS_PAID = "paid";
const PAYOUT_STATUS_PENDING = "pending";
const PAYOUT_STATUS_FAILED = "failed";
const GATEWAY_KHALTI = "khalti";
const GATEWAY_ESEWA = "esewa";
const DRIVER_SHARE_RATIO = 0.9;
const DEFAULT_WEEKS = 8;
const DEFAULT_MONTHS = 12;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface SeedPayoutSpec {
  daysAgo: number;
  amount: number;
  status: string;
}

interface ExpectedBucket {
  period: string;
  totalAmount: number;
  jobCount: number;
}

const PAYOUT_SPECS: Record<string, SeedPayoutSpec[]> = {
  "earnings.driver.a@example.com": [
    { daysAgo: 3, amount: 1000, status: PAYOUT_STATUS_PAID },
    { daysAgo: 10, amount: 1500, status: PAYOUT_STATUS_PAID },
    { daysAgo: 45, amount: 1200, status: PAYOUT_STATUS_PAID },
    { daysAgo: 60, amount: 1800, status: PAYOUT_STATUS_PAID },
    { daysAgo: 90, amount: 2200, status: PAYOUT_STATUS_PAID },
    { daysAgo: 5, amount: 800, status: PAYOUT_STATUS_PENDING },
    { daysAgo: 20, amount: 600, status: PAYOUT_STATUS_FAILED },
  ],
  "earnings.driver.b@example.com": [
    { daysAgo: 7, amount: 2000, status: PAYOUT_STATUS_PAID },
    { daysAgo: 35, amount: 2500, status: PAYOUT_STATUS_PAID },
    { daysAgo: 15, amount: 900, status: PAYOUT_STATUS_PENDING },
  ],
  "earnings.driver.c@example.com": [
    { daysAgo: 120, amount: 3000, status: PAYOUT_STATUS_PAID },
    { daysAgo: 2, amount: 1100, status: PAYOUT_STATUS_PAID },
    { daysAgo: 50, amount: 400, status: PAYOUT_STATUS_FAILED },
  ],
};

function daysAgoUtc(days: number, hour = 12): Date {
  const date = new Date(Date.now() - days * DAY_MS);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

function weekStartUtc(date: Date): Date {
  const truncated = new Date(date);
  truncated.setUTCHours(0, 0, 0, 0);
  const daysSinceMonday =
    truncated.getUTCDay() === 0 ? 6 : truncated.getUTCDay() - 1;
  truncated.setUTCDate(truncated.getUTCDate() - daysSinceMonday);
  return truncated;
}

function monthStartUtc(date: Date): Date {
  const truncated = new Date(date);
  truncated.setUTCHours(0, 0, 0, 0);
  truncated.setUTCDate(1);
  return truncated;
}

function formatWeekLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMonthLabel(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function buildExpectedBuckets(
  payouts: { createdAt: Date; amount: number }[],
  unit: "week" | "month",
  windowStart?: Date
): ExpectedBucket[] {
  const bucketsByPeriod = new Map<string, { totalAmount: number; jobCount: number }>();
  for (const payout of payouts) {
    if (windowStart && payout.createdAt < windowStart) continue;
    const period =
      unit === "week"
        ? formatWeekLabel(weekStartUtc(payout.createdAt))
        : formatMonthLabel(monthStartUtc(payout.createdAt));
    const bucket = bucketsByPeriod.get(period) ?? { totalAmount: 0, jobCount: 0 };
    bucket.totalAmount += payout.amount;
    bucket.jobCount += 1;
    bucketsByPeriod.set(period, bucket);
  }
  return [...bucketsByPeriod.entries()]
    .sort(([periodA], [periodB]) => (periodA < periodB ? -1 : periodA > periodB ? 1 : 0))
    .map(([period, bucket]) => ({
      period,
      totalAmount: bucket.totalAmount,
      jobCount: bucket.jobCount,
    }));
}

function assertBucketsEqual(
  label: string,
  actual: ExpectedBucket[],
  expected: ExpectedBucket[]
): boolean {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  const matches = actualJson === expectedJson;
  console.log(`\n[${label}] ${matches ? "PASS" : "FAIL"}`);
  console.log(`  expected: ${expectedJson}`);
  console.log(`  actual:   ${actualJson}`);
  return matches;
}

async function main(): Promise<void> {
  if (existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not set. Provide a .env.local file or set the env var.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  try {
    const existingUsers = await User.find({
      email: { $in: [...SEED_DRIVER_EMAILS, SEED_POSTER_EMAIL] },
    }).select("_id").lean();
    const existingUserIds = existingUsers.map((user) => user._id);
    if (existingUserIds.length > 0) {
      await Payout.deleteMany({ driverId: { $in: existingUserIds } });
      await Job.deleteMany({ driverId: { $in: existingUserIds } });
      await User.deleteMany({ _id: { $in: existingUserIds } });
    }

    const poster = await User.create({
      name: "Earnings Seed Poster",
      email: SEED_POSTER_EMAIL,
      role: POSTER_ROLE,
    });

    let payoutCounter = 0;

    for (const driverEmail of SEED_DRIVER_EMAILS) {
      const driver = await User.create({
        name: `Earnings Seed Driver ${driverEmail.split(".")[2].toUpperCase()}`,
        email: driverEmail,
        role: DRIVER_ROLE,
      });

      const createdPayouts: { createdAt: Date; amount: number; status: string }[] = [];
      const specs = PAYOUT_SPECS[driverEmail];

      for (const spec of specs) {
        const job = await Job.create({
          posterId: poster._id,
          driverId: driver._id,
          status: JOB_STATUS_DELIVERED,
          pickupAddress: "Seed Pickup Address",
          pickupContactName: "Seed Pickup Contact",
          pickupPhone: "9800000000",
          dropoffAddress: "Seed Dropoff Address",
          dropoffContactName: "Seed Dropoff Contact",
          dropoffPhone: "9800000001",
          vehicleType: JOB_VEHICLE_BICYCLE,
          offeredPrice: Math.round(spec.amount / DRIVER_SHARE_RATIO),
          pickupDate: "2026-01-01",
          pickupTimeWindow: "10:00-12:00",
          paymentStatus: PAYOUT_STATUS_PAID,
        });

        const createdAt = daysAgoUtc(spec.daysAgo);
        const platformFee =
          Math.round(spec.amount / DRIVER_SHARE_RATIO) - spec.amount;

        const payout = await new Payout({
          driverId: driver._id,
          jobId: job._id,
          amount: spec.amount,
          platformFee,
          gateway: payoutCounter % 2 === 0 ? GATEWAY_KHALTI : GATEWAY_ESEWA,
          gatewayTransactionId: `earnings-seed-${randomUUID()}`,
          status: spec.status,
          createdAt,
        }).save({ timestamps: false });

        const savedCreatedAt = payout.get("createdAt") as Date | undefined;
        const createdAtMatches =
          savedCreatedAt !== undefined && savedCreatedAt.getTime() === createdAt.getTime();
        if (!createdAtMatches) {
          console.error(
            `WARNING: createdAt was overridden for ${driverEmail} spec daysAgo=${spec.daysAgo}`
          );
        }

        createdPayouts.push({
          createdAt: savedCreatedAt ?? createdAt,
          amount: payout.amount,
          status: payout.status,
        });
        payoutCounter += 1;
      }

      const driverId = String(driver._id);
      const now = new Date();
      const weeklyWindowStart = new Date(weekStartUtc(now).getTime() - (DEFAULT_WEEKS - 1) * WEEK_MS);
      const monthlyWindowStart = monthStartUtc(now);
      monthlyWindowStart.setUTCMonth(monthlyWindowStart.getUTCMonth() - (DEFAULT_MONTHS - 1));

      const paidPayouts = createdPayouts.filter(
        (payout) => payout.status === PAYOUT_STATUS_PAID
      );

      const weeklyExpected = buildExpectedBuckets(paidPayouts, "week", weeklyWindowStart);
      const monthlyExpected = buildExpectedBuckets(paidPayouts, "month", monthlyWindowStart);
      const allTimeExpected = buildExpectedBuckets(paidPayouts, "month");

      const weeklyActual = await getWeeklyEarnings(driverId);
      const monthlyActual = await getMonthlyEarnings(driverId);
      const allTimeActual = await getAllTimeEarnings(driverId);

      console.log(`\n=== Driver ${driverEmail} ===`);
      console.log(`Payouts created: ${createdPayouts.length} (paid: ${paidPayouts.length})`);

      const weeklyPass = assertBucketsEqual("weekly (8w)", weeklyActual, weeklyExpected);
      const monthlyPass = assertBucketsEqual("monthly (12m)", monthlyActual, monthlyExpected);
      const allTimePass = assertBucketsEqual("all-time", allTimeActual, allTimeExpected);

      if (!weeklyPass || !monthlyPass || !allTimePass) {
        process.exitCode = 1;
      }
    }

    console.log(
      `\n${process.exitCode ? "SEED COMPLETED WITH FAILURES" : "SEED COMPLETED — ALL AGGREGATION CHECKS PASSED"}`
    );
  } finally {
    await mongoose.disconnect();
  }
}

void main();
