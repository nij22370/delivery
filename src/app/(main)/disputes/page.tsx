"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useMyJobs } from "@/api/hooks/jobs/jobsApi";
import { formatNpr, formatShortDate } from "@/utils/format";
import { JOB_STATUS } from "@/types/job";

const ADMIN_ROLE = "admin";
const PAGE_SIZE = 50;

export default function DisputesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  const isAdmin = user?.role === ADMIN_ROLE;
  const isDriver = user?.role === "driver";

  const {
    data: jobsData,
    isLoading: isJobsLoading,
    isError,
    error,
    refetch,
  } = useMyJobs({
    page: 1,
    limit: PAGE_SIZE,
    driverId: isDriver ? "me" : undefined,
    status: JOB_STATUS.DISPUTED,
  });

  // Redirect admin to the admin disputes queue
  if (isAdmin) {
    router.replace("/admin/disputes");
  }

  const disputedJobs = useMemo(() => jobsData?.jobs ?? [], [jobsData]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isAuthLoading || isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl">gavel</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
                Disputes
              </h1>
              <p className="text-sm text-on-surface-variant mt-0.5">
                Manage and track your delivery disputes under SwiftShip admin review.
              </p>
            </div>
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <div className="mb-8 p-6 bg-error-container/40 border border-error-red/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-error-red text-2xl">error</span>
              <div>
                <p className="text-sm font-semibold text-error-red">Failed to load disputes</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {error instanceof Error ? error.message : "Network error occurred."}
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

        {/* Loading State */}
        {isJobsLoading ? (
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-32 bg-surface-container rounded-xl" />
            ))}
          </div>
        ) : disputedJobs.length === 0 ? (
          /* Empty State */
          <div className="bg-surface-white border border-outline-variant rounded-2xl p-12 text-center shadow-sm max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">gavel</span>
            </div>
            <h2 className="text-xl font-bold text-on-surface mb-2">No Active Disputes</h2>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
              All your deliveries are running smoothly! If you encounter any issue with an active or completed delivery, you can flag a dispute directly from the job detail page.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-container transition-colors cursor-pointer"
            >
              Back to Dashboard
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        ) : (
          /* Disputed Jobs Grid / List */
          <div className="space-y-4">
            {disputedJobs.map((job) => {
              const shortJobId = `SF-${job._id.slice(-6).toUpperCase()}`;
              return (
                <div
                  key={job._id}
                  className="bg-surface-white border border-error-red/30 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-base font-bold text-on-surface">Job #{shortJobId}</span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-error-red/10 text-error-red flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">report</span>
                        Under Admin Review
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        Flagged on {formatShortDate(job.createdAt)}
                      </span>
                    </div>

                    {/* Address snippet */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-on-surface">
                      <div className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-primary text-base">trip_origin</span>
                        <span className="truncate max-w-xs">{job.pickupAddress}</span>
                      </div>
                      <span className="hidden sm:inline text-on-surface-variant">→</span>
                      <div className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-success-green text-base">location_on</span>
                        <span className="truncate max-w-xs">{job.dropoffAddress}</span>
                      </div>
                    </div>

                    {/* Reason snippet */}
                    {(job.disputeReason || job.packageDescription) && (
                      <p className="text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/50">
                        <strong className="text-on-surface">Issue Details:</strong> {job.disputeReason || job.packageDescription}
                      </p>
                    )}
                  </div>

                  {/* Actions & Price */}
                  <div className="flex flex-row md:flex-col items-end justify-between gap-4 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-outline-variant/40">
                    <div className="text-right">
                      <span className="text-xs text-on-surface-variant uppercase tracking-wider block">Agreed Price</span>
                      <span className="text-lg font-bold text-primary">{formatNpr(job.offeredPrice)}</span>
                    </div>

                    <Link
                      href={`/jobs/${job._id}`}
                      className="px-5 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      View Details
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
