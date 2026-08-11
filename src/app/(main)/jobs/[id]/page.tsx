"use client";

import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { JOB_STATUS } from "@/types/job";
import type { JobVehicleType } from "@/types/job";
import { use } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const MapPreview = dynamic(() => import("@/components/MapPreview"), { ssr: false });

// ── Constants ────────────────────────────────────────────────────────────────
const JOB_DETAIL_QUERY_KEY = "job-detail";
const ACCEPT_ENDPOINT_BASE = "/api/jobs";
const POSTER_ROLE = "poster";
const DASHBOARD_PATH = "/dashboard";

const VEHICLE_LABELS: Record<JobVehicleType, string> = {
  bicycle: "Bicycle / Scooter",
  car: "Standard Sedan",
  van: "Cargo Van",
  truck: "Box Truck",
};

const STATUS_STYLES: Record<string, string> = {
  posted: "bg-primary/10 text-primary",
  accepted: "bg-success-green/10 text-success-green",
  in_transit: "bg-warning-amber/10 text-warning-amber",
  delivered: "bg-success-green/10 text-success-green",
  cancelled: "bg-error-container text-error-red",
};

// ── Types ────────────────────────────────────────────────────────────────────
interface JobDetail {
  _id: string;
  posterId: string;
  driverId: string | null;
  status: string;
  pickupAddress: string;
  pickupContactName: string;
  pickupPhone: string;
  pickupInstructions?: string;
  dropoffAddress: string;
  dropoffContactName: string;
  dropoffPhone: string;
  vehicleType: JobVehicleType;
  packageDescription?: string;
  offeredPrice: number;
  pickupDate: string;
  pickupTimeWindow: string;
  createdAt: string;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────
async function fetchJobById(jobId: string): Promise<JobDetail> {
  const response = await fetch(`${ACCEPT_ENDPOINT_BASE}/${jobId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { message?: string }).message ?? "Failed to load job.");
  }
  const data: { job: JobDetail } = await response.json();
  return data.job;
}

async function acceptJob(jobId: string): Promise<{ job: JobDetail }> {
  const response = await fetch(`${ACCEPT_ENDPOINT_BASE}/${jobId}/accept`, { method: "POST" });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { message?: string }).message ?? "Failed to accept job."
    );
  }
  return response.json();
}

// ── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const label = status.replace("_", " ");
  const styleClass = STATUS_STYLES[status] ?? "bg-surface-container text-on-surface-variant";
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${styleClass}`}>
      {label}
    </span>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-on-surface-variant text-xl mt-0.5">
        {icon}
      </span>
      <div>
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="text-sm font-medium text-on-surface">{value}</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  // Posters have no business on a driver-facing job detail page.
  // Once auth resolves and we know the role, redirect them away.
  useEffect(() => {
    if (!isAuthLoading && user?.role === POSTER_ROLE) {
      router.replace(DASHBOARD_PATH);
    }
  }, [isAuthLoading, user, router]);

  const isDriver = !isAuthLoading && user?.role !== POSTER_ROLE;

  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [JOB_DETAIL_QUERY_KEY, id],
    queryFn: () => fetchJobById(id),
    retry: false,
    enabled: isDriver,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [JOB_DETAIL_QUERY_KEY, id] });
    },
  });

  const handleAccept = useCallback(() => {
    acceptMutation.mutate();
  }, [acceptMutation]);

  const isContactRevealed = job?.status !== JOB_STATUS.POSTED;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8 animate-pulse">
          <div className="h-4 bg-surface-container-high rounded w-32 mb-6" />
          <div className="h-8 bg-surface-container-high rounded w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-surface-container rounded-xl" />
              <div className="h-48 bg-surface-container rounded-xl" />
            </div>
            <div className="h-64 bg-surface-container rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError || !job) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-outlined text-5xl text-error-red mb-4 block">
            error_outline
          </span>
          <h1 className="text-xl font-semibold text-on-surface mb-2">Job Not Found</h1>
          <p className="text-sm text-on-surface-variant mb-6">
            {error instanceof Error ? error.message : "This job could not be loaded."}
          </p>
          <Link
            href="/jobs/browse"
            className="text-sm font-semibold text-primary hover:underline"
          >
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  // ── Job ID display — first 8 chars of MongoDB ObjectId ──────────────────
  const shortJobId = `SF-${job._id.slice(-6).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-surface-container-low">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Back Link */}
        <Link
          href="/jobs/browse"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-6 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Browse
        </Link>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-on-surface">Job #{shortJobId}</h1>
            <StatusBadge status={job.status} />
          </div>
          <div className="text-right">
            <p className="text-xs text-on-surface-variant uppercase tracking-wide">Agreed Payout</p>
            <p className="text-3xl font-bold text-primary">
              ${(job.offeredPrice / 100).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left / Main column ─────────────────────────────────────── */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Map Preview */}
            <div className="bg-surface-white border border-outline-variant rounded-xl overflow-hidden h-64 relative">
              <span className="absolute top-3 left-3 z-20 bg-surface-white text-on-surface text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-secondary-container">
                Route Preview
              </span>
              <MapPreview
                pickupAddress={job.pickupAddress}
                dropoffAddress={job.dropoffAddress}
              />
            </div>

            {/* Pickup / Dropoff */}
            <div className="bg-surface-white border border-outline-variant rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pickup */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-xl">
                      trip_origin
                    </span>
                    <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wide">
                      Pickup
                    </h2>
                  </div>
                  <p className="text-sm font-medium text-on-surface">{job.pickupAddress}</p>
                  {isContactRevealed ? (
                    <p className="text-sm text-on-surface-variant mt-1">
                      Contact: {job.pickupContactName} · {job.pickupPhone}
                    </p>
                  ) : (
                    <p className="text-xs text-on-surface-variant mt-2 italic">
                      Contact info revealed after acceptance
                    </p>
                  )}
                </div>

                {/* Dropoff */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-success-green text-xl">
                      location_on
                    </span>
                    <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wide">
                      Dropoff
                    </h2>
                  </div>
                  <p className="text-sm font-medium text-on-surface">{job.dropoffAddress}</p>
                  {isContactRevealed ? (
                    <p className="text-sm text-on-surface-variant mt-1">
                      Contact: {job.dropoffContactName} · {job.dropoffPhone}
                    </p>
                  ) : (
                    <p className="text-xs text-on-surface-variant mt-2 italic">
                      Contact info revealed after acceptance
                    </p>
                  )}
                </div>
              </div>

              {/* Special Instructions */}
              {job.pickupInstructions && (
                <div className="mt-5 pt-4 border-t border-outline-variant/50">
                  <div className="flex items-start gap-3 p-3 bg-warning-amber/10 rounded-lg border border-warning-amber/30">
                    <span className="material-symbols-outlined text-warning-amber text-xl mt-0.5">
                      info
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-warning-amber uppercase tracking-wide mb-1">
                        Special Instructions
                      </p>
                      <p className="text-sm text-on-surface">{job.pickupInstructions}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Package Notes */}
              {job.packageDescription && (
                <div className="mt-4 pt-4 border-t border-outline-variant/50">
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                    Package Notes
                  </p>
                  <p className="text-sm text-on-surface">{job.packageDescription}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Sidebar ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            {/* Job Requirements */}
            <div className="bg-surface-white border border-outline-variant rounded-xl p-6">
              <h2 className="text-base font-semibold text-on-surface mb-5">
                Job Requirements
              </h2>
              <div className="flex flex-col gap-4">
                <DetailRow
                  icon="directions_car"
                  label="Vehicle Requirement"
                  value={VEHICLE_LABELS[job.vehicleType]}
                />
                <DetailRow
                  icon="calendar_today"
                  label="Delivery Date"
                  value={job.pickupDate}
                />
                <DetailRow
                  icon="schedule"
                  label="Delivery Window"
                  value={job.pickupTimeWindow}
                />
              </div>
            </div>

            {/* Accept / Decline — driver only, posted status only */}
            {job.status === JOB_STATUS.POSTED && (
              <div className="bg-surface-white border border-outline-variant rounded-xl p-6">
                {acceptMutation.isError && (
                  <div className="mb-4 p-3 text-sm text-error-red bg-error-container border border-error-red/40 rounded-lg">
                    {acceptMutation.error instanceof Error
                      ? acceptMutation.error.message
                      : "Failed to accept job."}
                  </div>
                )}
                <button
                  id="btn-accept-job"
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary h-12 rounded-lg text-sm font-semibold hover:bg-primary-container transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer mb-3"
                >
                  {acceptMutation.isPending ? (
                    <>
                      <span className="material-symbols-outlined text-xl animate-spin">
                        progress_activity
                      </span>
                      Accepting...
                    </>
                  ) : (
                    <>
                      Accept Job
                      <span className="material-symbols-outlined text-xl">check_circle</span>
                    </>
                  )}
                </button>
                <button
                  id="btn-decline-job"
                  onClick={() => window.history.back()}
                  disabled={acceptMutation.isPending}
                  className="w-full h-12 border border-outline-variant text-on-surface rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors disabled:opacity-75 cursor-pointer"
                >
                  Decline
                </button>
                <p className="text-xs text-center text-on-surface-variant mt-3">
                  By accepting, you agree to the SwiftShip terms of service.
                </p>
              </div>
            )}

            {/* Accepted confirmation */}
            {job.status === JOB_STATUS.ACCEPTED && (
              <div className="bg-success-green/10 border border-success-green/30 rounded-xl p-5 text-center">
                <span className="material-symbols-outlined text-3xl text-success-green block mb-2">
                  check_circle
                </span>
                <p className="text-sm font-semibold text-success-green">Job Accepted</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Contact info is now visible above.
                </p>
                <Link
                  href={`/jobs/${job._id}/active`}
                  className="mt-4 w-full h-12 flex items-center justify-center gap-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-all cursor-pointer"
                >
                  Go to Active Delivery
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
