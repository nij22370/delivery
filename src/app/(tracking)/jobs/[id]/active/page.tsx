"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { apiFetch } from "@/utils/apiFetch";
import { geocodeAddress } from "@/utils/geocode";
import type { Coordinates } from "@/utils/geocode";
import { fetchRoute, interpolateAlongPath } from "@/utils/routing";
import { createThrottle } from "@/utils/throttle";
import { JOB_STATUS } from "@/types/job";
import type { JobVehicleType } from "@/types/job";

const LiveTrackingMap = dynamic(() => import("@/components/LiveTrackingMap"), {
  ssr: false,
});

// ── Constants ────────────────────────────────────────────────────────────────
const JOB_DETAIL_QUERY_KEY = "job-detail-for-execution";
const GEOCODE_QUERY_KEY = "execution-geocode";
const ROUTE_QUERY_KEY = "execution-route";
const JOB_ENDPOINT_BASE = "/api/jobs";
const JOB_SHORT_ID_CHARS = 6;

const GPS_PING_INTERVAL_MS = 10_000;
const SIMULATION_TICK_MS = 1_000;
const SIMULATION_STEPS = 40;

const FALLBACK_COORDS: Coordinates = { lat: 27.7172, lng: 85.324 };

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 10_000,
};

const STATUS_LABELS: Record<string, string> = {
  posted: "Posted",
  accepted: "Accepted",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  posted: "bg-surface-container text-on-surface-variant",
  accepted: "bg-primary/10 text-primary",
  in_transit: "bg-primary/10 text-primary",
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
}

interface JobLocations {
  pickup: Coordinates | null;
  dropoff: Coordinates | null;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────
async function fetchJobForExecution(jobId: string): Promise<JobDetail> {
  const response = await apiFetch(`${JOB_ENDPOINT_BASE}/${jobId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { message?: string }).message ?? "Failed to load job.");
  }
  const data: { job: JobDetail } = await response.json();
  return data.job;
}

async function geocodeJobLocations(job: JobDetail): Promise<JobLocations> {
  const [pickup, dropoff] = await Promise.all([
    job.pickupAddress ? geocodeAddress(job.pickupAddress) : Promise.resolve(null),
    job.dropoffAddress ? geocodeAddress(job.dropoffAddress) : Promise.resolve(null),
  ]);
  return { pickup, dropoff };
}

async function postStatusChange(
  jobId: string,
  action: "transit" | "deliver"
): Promise<{ job: JobDetail }> {
  const response = await apiFetch(`${JOB_ENDPOINT_BASE}/${jobId}/${action}`, {
    method: "POST",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { message?: string }).message ?? "Failed to update job status."
    );
  }
  return response.json();
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace("_", " ");
}

function getStatusBadgeClass(status: string): string {
  return STATUS_BADGE_STYLES[status] ?? "bg-surface-container text-on-surface-variant";
}

function getPrimaryButtonContent(isPending: boolean, isDeliver: boolean): ReactNode {
  if (isPending) {
    return (
      <>
        <span className="material-symbols-outlined text-xl animate-spin">
          progress_activity
        </span>
        {isDeliver ? "Marking delivered..." : "Starting delivery..."}
      </>
    );
  }
  return (
    <>
      <span className="material-symbols-outlined text-xl">
        {isDeliver ? "check_circle" : "local_shipping"}
      </span>
      {isDeliver ? "Mark Delivered" : "Start Delivery"}
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${getStatusBadgeClass(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function AddressRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-primary mt-0.5 text-xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-medium text-on-surface truncate">{value}</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ActiveJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  const [livePosition, setLivePosition] = useState<Coordinates | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const simulationProgressRef = useRef(0);

  const isGeolocationSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  const throttledPing = useMemo(() => createThrottle(GPS_PING_INTERVAL_MS), []);

  const {
    data: job,
    isLoading: isJobLoading,
    isError: isJobError,
  } = useQuery({
    queryKey: [JOB_DETAIL_QUERY_KEY, id],
    queryFn: () => fetchJobForExecution(id),
    retry: false,
    enabled: !isAuthLoading,
  });

  const { data: jobLocations } = useQuery({
    queryKey: [GEOCODE_QUERY_KEY, job?._id],
    queryFn: () => geocodeJobLocations(job!),
    enabled: !!job,
    retry: false,
  });

  const pickup = jobLocations?.pickup ?? null;
  const dropoff = jobLocations?.dropoff ?? null;

  const { data: route } = useQuery({
    queryKey: [ROUTE_QUERY_KEY, id, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng],
    queryFn: () => fetchRoute(pickup!, dropoff!),
    enabled: !!pickup && !!dropoff,
    retry: false,
  });

  const sendLocationPing = useCallback(
    async (position: Coordinates) => {
      try {
        await apiFetch(`${JOB_ENDPOINT_BASE}/${id}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: position.lat, lng: position.lng }),
        });
      } catch (error: unknown) {
        console.error("Location ping send error:", error);
      }
    },
    [id]
  );

  const handlePositionUpdate = useCallback(
    (position: Coordinates) => {
      setLivePosition(position);
      throttledPing(() => {
        void sendLocationPing(position);
      });
    },
    [throttledPing, sendLocationPing]
  );

  const transitMutation = useMutation({
    mutationFn: () => postStatusChange(id, "transit"),
    onSuccess: (data) => {
      queryClient.setQueryData([JOB_DETAIL_QUERY_KEY, id], data.job);
      if (pickup) {
        setLivePosition(pickup);
        void sendLocationPing(pickup);
      }
    },
  });

  const deliverMutation = useMutation({
    mutationFn: () => postStatusChange(id, "deliver"),
    onSuccess: (data) => {
      queryClient.setQueryData([JOB_DETAIL_QUERY_KEY, id], data.job);
    },
  });

  const handleStartDelivery = useCallback(() => {
    transitMutation.mutate();
  }, [transitMutation]);

  const handleMarkDelivered = useCallback(() => {
    deliverMutation.mutate();
  }, [deliverMutation]);

  const handleToggleSimulation = useCallback(() => {
    setIsSimulating((previous) => {
      simulationProgressRef.current = 0;
      return !previous;
    });
  }, []);

  // Live GPS: only while in transit and not simulating.
  useEffect(() => {
    if (job?.status !== JOB_STATUS.IN_TRANSIT || isSimulating) return;
    if (!isGeolocationSupported) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        handlePositionUpdate({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        setGpsError(`GPS unavailable (${error.message}) — use Simulate GPS.`);
      },
      GEOLOCATION_OPTIONS
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [job?.status, isSimulating, handlePositionUpdate, isGeolocationSupported]);

  // GPS simulation: move along the OSRM path so the demo works without a device.
  useEffect(() => {
    if (!isSimulating || !route || job?.status !== JOB_STATUS.IN_TRANSIT) return;

    const intervalId = setInterval(() => {
      simulationProgressRef.current += 1 / SIMULATION_STEPS;

      if (simulationProgressRef.current >= 1) {
        simulationProgressRef.current = 1;
        clearInterval(intervalId);
        const endPoint = route.path[route.path.length - 1];
        if (endPoint) {
          const end = { lat: endPoint[0], lng: endPoint[1] };
          setLivePosition(end);
          throttledPing(() => {
            void sendLocationPing(end);
          });
        }
        return;
      }

      handlePositionUpdate(
        interpolateAlongPath(route.path, simulationProgressRef.current)
      );
    }, SIMULATION_TICK_MS);

    return () => clearInterval(intervalId);
  }, [isSimulating, route, job?.status, handlePositionUpdate, throttledPing, sendLocationPing]);

  const trackingId = `SS-${id.slice(-JOB_SHORT_ID_CHARS).toUpperCase()}`;
  const isAccepted = job?.status === JOB_STATUS.ACCEPTED;
  const isInTransit = job?.status === JOB_STATUS.IN_TRANSIT;
  const isDelivered = job?.status === JOB_STATUS.DELIVERED;
  const isActiveStatus = isAccepted || isInTransit || isDelivered;

  const geolocationUnavailableMessage =
    isInTransit && !isSimulating && !isGeolocationSupported
      ? "Geolocation is unavailable in this browser — use Simulate GPS."
      : null;

  const gpsErrorMessage = gpsError ?? geolocationUnavailableMessage;

  const gpsIndicatorLabel = isSimulating
    ? "Simulating GPS"
    : gpsErrorMessage
      ? "GPS unavailable"
      : isInTransit
        ? "Live GPS active"
        : "GPS standby";

  const mutationError = transitMutation.isError
    ? transitMutation.error
    : deliverMutation.isError
      ? deliverMutation.error
      : null;

  if (isAuthLoading || isJobLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (isJobError || !job) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-outlined text-5xl text-error-red mb-4 block">
            error_outline
          </span>
          <h1 className="text-xl font-semibold text-on-surface mb-2">Job Not Found</h1>
          <Link
            href="/jobs/browse"
            className="text-sm font-semibold text-primary hover:underline cursor-pointer"
          >
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "driver" || user._id !== job.driverId) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-outlined text-5xl text-error-red mb-4 block">
            lock
          </span>
          <h1 className="text-xl font-semibold text-on-surface mb-2">Not Authorized</h1>
          <p className="text-sm text-on-surface-variant">
            Only the assigned driver can execute this delivery.
          </p>
          <Link
            href="/jobs/browse"
            className="text-sm font-semibold text-primary hover:underline mt-4 block cursor-pointer"
          >
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-container-low overflow-hidden">
      <header className="h-12 md:h-14 flex items-center justify-between px-4 bg-surface-white border-b border-secondary-container z-20 flex-shrink-0">
        <Link
          href="/jobs/browse"
          className="inline-flex items-center gap-1 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span className="hidden sm:inline">Browse</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-on-surface-variant">{trackingId}</span>
          <StatusBadge status={job.status} />
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${isSimulating || isInTransit ? "bg-success-green animate-pulse" : "bg-secondary-fixed-dim"}`}
          />
          <span className="text-xs font-semibold text-on-surface-variant">
            {gpsIndicatorLabel}
          </span>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <LiveTrackingMap
          jobId={id}
          initialLat={pickup?.lat ?? FALLBACK_COORDS.lat}
          initialLng={pickup?.lng ?? FALLBACK_COORDS.lng}
          pickupLat={pickup?.lat}
          pickupLng={pickup?.lng}
          dropoffLat={dropoff?.lat}
          dropoffLng={dropoff?.lng}
          routePath={route?.path ?? null}
          vehiclePosition={livePosition}
        />

        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 md:px-6 md:pb-6">
          <div className="mx-auto w-full max-w-md bg-surface-white rounded-xl shadow-lg border border-secondary-container p-4 flex flex-col gap-4">
            {isActiveStatus && (
              <div className="flex flex-col gap-2">
                <AddressRow
                  icon="trip_origin"
                  label="Pickup"
                  value={job.pickupAddress}
                />
                <AddressRow
                  icon="flag"
                  label="Dropoff"
                  value={job.dropoffAddress}
                />
              </div>
            )}

            {mutationError && (
              <div className="p-3 text-sm text-error-red bg-error-container border border-error-red/40 rounded-lg">
                {mutationError instanceof Error
                  ? mutationError.message
                  : "Failed to update job status."}
              </div>
            )}

            {gpsErrorMessage && isInTransit && (
              <div className="p-3 text-sm text-warning-amber bg-warning-amber/10 border border-warning-amber/30 rounded-lg">
                {gpsErrorMessage}
              </div>
            )}

            {isAccepted && (
              <button
                type="button"
                onClick={handleStartDelivery}
                disabled={transitMutation.isPending}
                className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {getPrimaryButtonContent(transitMutation.isPending, false)}
              </button>
            )}

            {isInTransit && (
              <>
                <button
                  type="button"
                  onClick={handleMarkDelivered}
                  disabled={deliverMutation.isPending}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
                >
                  {getPrimaryButtonContent(deliverMutation.isPending, true)}
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
                <span className="material-symbols-outlined text-5xl text-success-green block">
                  check_circle
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-on-surface">
                    Delivery Complete
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    Package delivered to {job.dropoffContactName}.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/jobs/browse"
                    className="w-full h-12 flex items-center justify-center gap-2 bg-primary-container text-on-primary-container rounded-lg text-sm font-semibold hover:bg-surface-tint transition-colors cursor-pointer"
                  >
                    Browse New Jobs
                  </Link>
                  <Link
                    href={`/jobs/${id}`}
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-lg border border-secondary-container text-on-surface text-sm font-semibold hover:bg-surface-container-low transition-colors cursor-pointer"
                  >
                    View Job Details
                  </Link>
                </div>
              </div>
            )}

            {!isActiveStatus && (
              <div className="text-center py-2">
                <p className="text-sm text-on-surface-variant">
                  This delivery is no longer active.
                </p>
                <Link
                  href="/jobs/browse"
                  className="text-sm font-semibold text-primary hover:underline mt-2 inline-block cursor-pointer"
                >
                  Back to Browse
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
