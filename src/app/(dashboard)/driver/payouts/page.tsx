"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useDriverPayouts } from "@/api/hooks/drivers/payoutsApi";
import { formatCompletedDate } from "@/utils/format";
import type { DriverPayoutItem, PopulatedPayoutJob } from "@/types/payout/payout";

const STATUS_BADGE_CLASSES: Record<string, string> = {
  paid: "bg-success-green/10 text-success-green border border-success-green/30",
  pending: "bg-warning-amber/10 text-warning-amber border border-warning-amber/30",
  failed: "bg-error-container text-error-red border border-error-red/30",
};

const STATUS_ICONS: Record<string, string> = {
  paid: "check_circle",
  pending: "schedule",
  failed: "error",
};

function getShortAddress(address?: string): string {
  if (!address) return "N/A";
  return address.split(",")[0] ?? address;
}

function getJobIdString(jobId: PopulatedPayoutJob | string): string {
  if (typeof jobId === "string") return jobId;
  return jobId._id;
}

function PayoutRowSkeleton() {
  return (
    <div className="bg-surface-white border border-outline-variant rounded-xl p-5 animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-surface-container-high rounded w-48" />
        <div className="h-3 bg-surface-container rounded w-64" />
      </div>
      <div className="h-8 bg-surface-container-high rounded w-28 shrink-0" />
    </div>
  );
}

export default function DriverPayoutsPage() {
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const isDriver = !isAuthLoading && user?.role === "driver";

  const { data, isLoading, isError, error } = useDriverPayouts(isDriver);

  const payouts = useMemo(() => data?.payouts ?? [], [data]);
  const totalEarned = useMemo(() => data?.totalEarned ?? 0, [data]);
  const pendingPayout = useMemo(() => data?.pendingPayout ?? 0, [data]);
  const completedJobsCount = useMemo(
    () => payouts.filter((p) => p.status === "paid").length,
    [payouts]
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-on-surface py-8 md:py-12">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
              Driver Earnings & Payouts
            </h1>
            <p className="text-sm text-secondary mt-1">
              Track your completed delivery earnings and payout transfer status.
            </p>
          </div>
          <Link
            href="/jobs/browse"
            className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all cursor-pointer w-fit"
          >
            <span className="material-symbols-outlined text-lg">search</span>
            Find Deliveries
          </Link>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {/* Total Earned */}
          <div className="bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Total Earned (Paid)
              </span>
              <div className="w-10 h-10 rounded-full bg-success-green/10 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-success-green text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  payments
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-on-surface">
              NPR {totalEarned.toLocaleString("en-NP")}
            </div>
            <p className="text-xs text-secondary mt-2">
              From {completedJobsCount} completed and transferred {completedJobsCount === 1 ? "delivery" : "deliveries"}
            </p>
          </div>

          {/* Pending Payout */}
          <div className="bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Pending Payouts
              </span>
              <div className="w-10 h-10 rounded-full bg-warning-amber/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-warning-amber text-xl">
                  hourglass_top
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-primary">
              NPR {pendingPayout.toLocaleString("en-NP")}
            </div>
            <p className="text-xs text-secondary mt-2">
              Processing — typically settled within 1–2 business days
            </p>
          </div>

          {/* Total Payouts Recorded */}
          <div className="bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Total Payout Transactions
              </span>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">
                  receipt_long
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-on-surface">
              {payouts.length}
            </div>
            <p className="text-xs text-secondary mt-2">
              All-time deliveries with initiated/completed payouts
            </p>
          </div>
        </div>

        {/* Payout History Section */}
        <div className="bg-surface-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">
                history
              </span>
              <h2 className="text-lg font-semibold text-on-surface">
                Payout History
              </h2>
            </div>
            <span className="text-xs text-secondary font-medium">
              {payouts.length} {payouts.length === 1 ? "Record" : "Records"}
            </span>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-4">
              <PayoutRowSkeleton />
              <PayoutRowSkeleton />
              <PayoutRowSkeleton />
            </div>
          ) : isError ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-error-red block mb-2">
                error
              </span>
              <p className="text-sm font-semibold text-on-surface">Failed to load payouts</p>
              <p className="text-xs text-secondary mt-1">
                {error instanceof Error ? error.message : "Please try refreshing the page."}
              </p>
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-secondary">
                  account_balance_wallet
                </span>
              </div>
              <h3 className="text-base font-semibold text-on-surface mb-1">
                No payouts yet
              </h3>
              <p className="text-xs text-secondary max-w-sm mb-6">
                Deliveries you accept and complete will appear here with payout status updates.
              </p>
              <Link
                href="/jobs/browse"
                className="bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-all cursor-pointer"
              >
                Browse Available Jobs
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {payouts.map((payout: DriverPayoutItem) => {
                const rawJobId = getJobIdString(payout.jobId);
                const shortJobId = rawJobId.length > 6 ? `SS-${rawJobId.slice(-4).toUpperCase()}` : rawJobId;
                const isPopulatedJob = typeof payout.jobId !== "string";
                const job = isPopulatedJob ? (payout.jobId as PopulatedPayoutJob) : null;
                const statusBadge = STATUS_BADGE_CLASSES[payout.status] || STATUS_BADGE_CLASSES.pending;
                const statusIcon = STATUS_ICONS[payout.status] || "info";

                return (
                  <div
                    key={payout._id}
                    className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-lowest transition-colors"
                  >
                    {/* Left: Job & Route Info */}
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Link
                          href={`/jobs/${rawJobId}`}
                          className="text-sm font-bold text-primary hover:underline cursor-pointer"
                        >
                          Job #{shortJobId}
                        </Link>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusBadge}`}
                        >
                          <span
                            className="material-symbols-outlined text-sm"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {statusIcon}
                          </span>
                          {payout.status}
                        </span>
                        <span className="text-xs uppercase font-semibold text-secondary bg-surface-container-low px-2 py-0.5 rounded">
                          {payout.gateway}
                        </span>
                      </div>

                      {job && (
                        <div className="text-xs text-secondary flex items-center gap-1.5 truncate">
                          <span>{getShortAddress(job.pickupAddress)}</span>
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          <span className="font-semibold text-on-surface">{getShortAddress(job.dropoffAddress)}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-secondary">
                        Created: {formatCompletedDate(payout.createdAt)}
                      </div>
                    </div>

                    {/* Right: Price / Payout Details */}
                    <div className="text-right shrink-0 flex flex-col justify-center">
                      <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                        Driver Payout
                      </div>
                      <div className="text-lg font-extrabold text-primary mt-0.5">
                        NPR {payout.amount.toLocaleString("en-NP")}
                      </div>
                      <div className="text-[10px] text-secondary font-medium">
                        Platform Fee: NPR {(payout.platformFee || 0).toLocaleString("en-NP")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
