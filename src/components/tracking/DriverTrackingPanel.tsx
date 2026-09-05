"use client";

import Link from "next/link";

interface JobDetail {
  _id: string;
  posterId: string;
  driverId: string | null;
  status: string;
  pickupAddress: string;
  pickupPhone?: string;
  dropoffAddress: string;
  dropoffPhone?: string;
}

interface DriverTrackingPanelProps {
  jobId: string;
  job: JobDetail;
  isAccepted: boolean;
  isInTransit: boolean;
  isDelivered: boolean;
  gpsIndicatorLabel: string;
  isSimulating: boolean;
  mutationError: Error | null;
  gpsError: string | null;
  handleStartDelivery: () => void;
  handleMarkDelivered: () => void;
  handleToggleSimulation: () => void;
  handleSupport: () => void;
  transitMutationPending: boolean;
  deliverMutationPending: boolean;
}

export default function DriverTrackingPanel({
  jobId,
  job,
  isAccepted,
  isInTransit,
  isDelivered,
  gpsIndicatorLabel,
  isSimulating,
  mutationError,
  gpsError,
  handleStartDelivery,
  handleMarkDelivered,
  handleToggleSimulation,
  handleSupport,
  transitMutationPending,
  deliverMutationPending,
}: DriverTrackingPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Addresses */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary mt-0.5 text-xl">trip_origin</span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider">Pickup</p>
            <p className="text-sm font-medium text-on-surface">{job.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-success-green mt-0.5 text-xl">flag</span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider">Dropoff</p>
            <p className="text-sm font-medium text-on-surface">{job.dropoffAddress}</p>
          </div>
        </div>
      </div>

      {/* GPS indicator */}
      {isInTransit && (
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className={`w-2.5 h-2.5 rounded-full ${isSimulating || isInTransit ? "bg-success-green animate-pulse" : "bg-secondary-fixed-dim"}`}
          />
          <span className="text-on-surface-variant">{gpsIndicatorLabel}</span>
        </div>
      )}

      {/* Error banners */}
      {mutationError && (
        <div className="p-3 text-sm text-error-red bg-error-container border border-error-red/40 rounded-lg">
          {mutationError.message ?? "Failed to update job status."}
        </div>
      )}
      {gpsError && isInTransit && (
        <div className="p-3 text-sm text-warning-amber bg-warning-amber/10 border border-warning-amber/30 rounded-lg">
          {gpsError}
        </div>
      )}

      {/* Action buttons */}
      {isAccepted && (
        <button
          type="button"
          onClick={handleStartDelivery}
          disabled={transitMutationPending}
          className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
        >
          {transitMutationPending ? (
            <>
              <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
              Starting delivery...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">local_shipping</span>
              Start Delivery
            </>
          )}
        </button>
      )}

      {isInTransit && (
        <>
          <button
            type="button"
            onClick={handleMarkDelivered}
            disabled={deliverMutationPending}
            className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >
            {deliverMutationPending ? (
              <>
                <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                Marking delivered...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">check_circle</span>
                Mark Delivered
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleSimulation}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-lg border border-secondary-container text-on-surface text-sm font-semibold hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">
              {isSimulating ? "radio_button_checked" : "my_location"}
            </span>
            {isSimulating ? "Stop GPS Simulation" : "Simulate GPS"}
          </button>
        </>
      )}

      {isDelivered && (
        <div className="text-center flex flex-col gap-3">
          <span className="material-symbols-outlined text-5xl text-success-green block">check_circle</span>
          <p className="text-base font-semibold text-on-surface">Delivery Complete!</p>
          <p className="text-sm text-secondary">Package has been delivered successfully.</p>
          <Link
            href="/jobs/browse"
            className="w-full h-11 flex items-center justify-center gap-2 bg-primary-container text-on-primary-container rounded-lg text-sm font-semibold hover:bg-surface-tint transition-colors cursor-pointer"
          >
            Browse New Jobs
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-secondary-container/60">
        <Link
          href={`/jobs/${jobId}/chat`}
          className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border border-secondary-container bg-surface-white text-xs font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">chat</span>
          Live Chat
        </Link>
        <Link
          href={`/jobs/${jobId}`}
          className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border border-secondary-container bg-surface-white text-xs font-semibold text-secondary hover:text-on-surface transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">info</span>
          Details
        </Link>
      </div>
    </div>
  );
}
