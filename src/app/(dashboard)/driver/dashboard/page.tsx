"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useDriverSummary } from "@/api/hooks/drivers/driverDashboardApi";
import { useMyJobs } from "@/api/hooks/jobs/jobsApi";
import { formatNpr, formatShortDate } from "@/utils/format";
import { JOB_STATUS } from "@/types/job";

// ── Constants ────────────────────────────────────────────────────────────────
const MONTHLY_TARGET = 50;
const PAGE_SIZE = 5;
const POSTER_ROLE = "poster";
const ADMIN_ROLE = "admin";
const DRIVER_ROLE = "driver";

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  [JOB_STATUS.ACCEPTED]: {
    label: "Accepted",
    className: "bg-primary/10 text-primary",
  },
  [JOB_STATUS.IN_TRANSIT]: {
    label: "In Transit",
    className: "bg-primary/10 text-primary",
  },
  [JOB_STATUS.DELIVERED]: {
    label: "Delivered",
    className: "bg-success-green/10 text-success-green",
  },
  [JOB_STATUS.DISPUTED]: {
    label: "Disputed",
    className: "bg-error-red/10 text-error-red font-semibold",
  },
  [JOB_STATUS.CANCELLED]: {
    label: "Cancelled",
    className: "bg-error-red/10 text-error-red",
  },
  [JOB_STATUS.POSTED]: {
    label: "Posted",
    className: "bg-surface-container text-on-surface-variant",
  },
};

function CardSkeleton() {
  return (
    <div className="bg-surface-white border border-surface-variant rounded-xl p-6 animate-pulse">
      <div className="h-8 w-8 bg-surface-container-high rounded-lg mb-4" />
      <div className="h-4 w-24 bg-surface-container-high rounded mb-2" />
      <div className="h-8 w-16 bg-surface-container-high rounded" />
    </div>
  );
}

export default function DriverDashboardPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const [isOnline, setIsOnline] = useState(true);

  const isDriver = !isAuthLoading && user?.role === DRIVER_ROLE;

  useEffect(() => {
    if (!isAuthLoading && user) {
      if (user.role === POSTER_ROLE) {
        router.replace("/dashboard");
      } else if (user.role === ADMIN_ROLE) {
        router.replace("/admin");
      }
    }
  }, [isAuthLoading, user, router]);

  const driverId = user?._id ?? "";
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
  } = useDriverSummary(driverId, isDriver);

  const {
    data: jobsData,
    isLoading: isJobsLoading,
    isError: isJobsError,
  } = useMyJobs({ page: 1, limit: PAGE_SIZE });

  const stats = useMemo(() => summaryData?.data?.stats, [summaryData]);
  const recentJobs = useMemo(() => jobsData?.jobs ?? [], [jobsData]);

  const progressPercentage = useMemo(() => {
    if (!stats) return 0;
    return Math.min(100, Math.round((stats.completedJobsThisMonth / MONTHLY_TARGET) * 100));
  }, [stats]);

  const handleToggleOnline = useCallback(() => {
    setIsOnline((prev) => !prev);
  }, []);

  const handleRetry = useCallback(() => {
    refetchSummary();
  }, [refetchSummary]);

  if (isAuthLoading || (user && user.role !== DRIVER_ROLE)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  const isLoading = isSummaryLoading || isJobsLoading;

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-on-surface">
              Welcome back, {user?.name || "Driver"}
            </h1>
            <p className="text-lg text-on-surface-variant mt-1">
              Here is your activity summary.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-surface-white border border-outline-variant rounded-full px-4 py-2 shadow-sm">
            <div className="relative flex items-center justify-center">
              <div
                className={`w-3 h-3 rounded-full ${
                  isOnline ? "bg-success-green" : "bg-outline"
                }`}
              />
              {isOnline && (
                <div className="absolute inset-0 rounded-full bg-success-green animate-ping opacity-75" />
              )}
            </div>
            <span className="text-sm font-semibold text-on-surface">
              {isOnline ? "Online" : "Offline"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer ml-2">
              <input
                type="checkbox"
                checked={isOnline}
                onChange={handleToggleOnline}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success-green" />
            </label>
          </div>
        </div>

        {/* Error State */}
        {isSummaryError && (
          <div className="mb-8 p-6 bg-error-container/40 border border-error-red/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-error-red text-2xl">error</span>
              <div>
                <p className="text-sm font-semibold text-error-red">Failed to load activity summary</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {summaryError instanceof Error ? summaryError.message : "Network error occurred."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 5 }).map((_, idx) => (
              <CardSkeleton key={idx} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Card 1: Active Jobs */}
            <div className="bg-surface-white border border-surface-variant rounded-xl p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary-fixed rounded-lg text-primary">
                  <span className="material-symbols-outlined">directions_bike</span>
                </div>
              </div>
              <p className="text-sm font-medium text-on-surface-variant mb-1">Active Jobs</p>
              <h3 className="text-3xl font-bold text-on-surface">
                {stats?.activeJobCount ?? 0}
              </h3>
              <p className="text-xs text-primary mt-2 flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-base">local_shipping</span>
                Currently in delivery
              </p>
            </div>

            {/* Card 2: Monthly Goal */}
            <div className="bg-surface-white border border-surface-variant rounded-xl p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary-fixed rounded-lg text-primary">
                  <span className="material-symbols-outlined">target</span>
                </div>
              </div>
              <p className="text-sm font-medium text-on-surface-variant mb-1">Monthly Goal</p>
              <h3 className="text-3xl font-bold text-on-surface">
                {stats?.completedJobsThisMonth ?? 0}{" "}
                <span className="text-xl text-on-surface-variant font-normal">
                  / {MONTHLY_TARGET}
                </span>
              </h3>
              <div className="w-full bg-surface-container-high rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Card 3: Lifetime Deliveries */}
            <div className="bg-surface-white border border-surface-variant rounded-xl p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary-fixed rounded-lg text-primary">
                  <span className="material-symbols-outlined">inventory_2</span>
                </div>
              </div>
              <p className="text-sm font-medium text-on-surface-variant mb-1">Lifetime Deliveries</p>
              <h3 className="text-3xl font-bold text-on-surface">
                {(stats?.completedJobsTotal ?? 0).toLocaleString("en-NP")}
              </h3>
            </div>

            {/* Card 4: Total Earnings (Spans 2 cols on lg) */}
            <div className="bg-surface-white border border-surface-variant rounded-xl p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow lg:col-span-2">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-success-green/10 rounded-lg text-success-green">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
              </div>
              <p className="text-sm font-medium text-on-surface-variant mb-1">Total Earnings</p>
              <h3 className="text-4xl font-bold text-success-green">
                {formatNpr(stats?.totalEarnedNpr ?? 0)}
              </h3>
              <p className="text-xs text-on-surface-variant mt-2">
                Available to withdraw: {formatNpr(Math.min(12000, stats?.totalEarnedNpr ?? 0))}
              </p>
            </div>

            {/* Card 5 & 6 Stacked */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              {/* Driver Rating */}
              <div className="bg-surface-white border border-surface-variant rounded-xl p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className="material-symbols-outlined text-warning-amber text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  <h3 className="text-2xl font-semibold text-on-surface">
                    {(stats?.ratingAvg ?? 0).toFixed(1)}
                    <span className="text-base font-normal text-on-surface-variant">/5.0</span>
                  </h3>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Based on {stats?.ratingCount ?? 0} reviews
                </p>
              </div>

              {/* Account Status */}
              <div className="bg-surface-white border border-surface-variant rounded-xl p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow flex-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-variant mb-1">Account Status</p>
                  <h3 className="text-xl font-semibold text-on-surface capitalize">
                    {stats?.verificationStatus || "Pending"}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-success-green/10 flex items-center justify-center text-success-green">
                  <span className="material-symbols-outlined text-xl">verified</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity Section */}
        <div className="bg-surface-white border border-surface-variant rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-surface-variant flex justify-between items-center bg-surface-bright">
            <h2 className="text-xl font-semibold text-on-surface">Recent Activity</h2>
            <Link
              href="/jobs/browse"
              className="text-primary text-sm font-semibold hover:underline cursor-pointer"
            >
              View All
            </Link>
          </div>
          {isJobsLoading ? (
            <div className="p-8 text-center animate-pulse">
              <div className="h-6 bg-surface-container-high rounded w-full mb-3" />
              <div className="h-6 bg-surface-container-high rounded w-full mb-3" />
              <div className="h-6 bg-surface-container-high rounded w-full" />
            </div>
          ) : isJobsError || recentJobs.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2 block">
                inbox
              </span>
              <p className="text-sm font-semibold text-on-surface">No recent delivery activity</p>
              <p className="text-xs text-on-surface-variant mt-1 mb-4">
                Explore available open jobs and accept deliveries to start earning!
              </p>
              <Link
                href="/jobs/browse"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors cursor-pointer"
              >
                Browse Open Jobs
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-variant">
                    <th className="p-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      Status
                    </th>
                    <th className="p-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="p-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      Time
                    </th>
                    <th className="p-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-right">
                      Earning (NPR)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {recentJobs.map((job) => {
                    const badge = STATUS_BADGES[job.status] ?? {
                      label: job.status,
                      className: "bg-surface-container text-on-surface-variant",
                    };
                    return (
                      <tr
                        key={job._id}
                        className="hover:bg-surface-container-low transition-colors cursor-pointer"
                        onClick={() => router.push(`/jobs/${job._id}`)}
                      >
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-medium text-on-surface">
                          {job.dropoffAddress}
                        </td>
                        <td className="p-4 text-sm text-on-surface-variant">
                          {formatShortDate(job.createdAt)}
                        </td>
                        <td className="p-4 text-sm font-semibold text-on-surface text-right">
                          {formatNpr(job.offeredPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
