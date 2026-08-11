"use client";

import { use, useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type PusherJs from "pusher-js";
import type { Channel } from "pusher-js";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { apiFetch } from "@/utils/apiFetch";
import { useDriverPublicProfile } from "@/api/hooks/drivers/driverPublicProfileApi";
import { geocodeAddress } from "@/utils/geocode";
import type { Coordinates } from "@/utils/geocode";
import { fetchRoute, haversineDistanceMeters } from "@/utils/routing";
import {
  getInitials,
  formatAppliedDate,
  formatCompletedDate,
  formatDistanceMiles,
  formatArrivalTime,
  formatEtaLabel,
} from "@/utils/format";
import { JOB_STATUS } from "@/types/job";
import type { JobVehicleType } from "@/types/job";

const LiveTrackingMap = dynamic(() => import("@/components/LiveTrackingMap"), {
  ssr: false,
});

// ── Constants ────────────────────────────────────────────────────────────────
const JOB_DETAIL_QUERY_KEY = "job-detail-for-tracking";
const JOB_ENDPOINT_BASE = "/api/jobs";
const GEOCODE_QUERY_KEY = "tracking-geocode";
const ROUTE_QUERY_KEY = "tracking-route";

const STATUS_CHANGE_EVENT = "status-change";
const PRIVATE_CHANNEL_PREFIX = "private-job-";

const ROUTE_DEBOUNCE_DISTANCE_M = 100;

const FALLBACK_LAT = 27.7172;
const FALLBACK_LNG = 85.3240;

const JOB_SHORT_ID_CHARS = 6;
const ACTIVE_NAV_LABEL = "Deliveries";

const FILLED_ICON_STYLE = { fontVariationSettings: "'FILL' 1" } as const;

const SIDEBAR_LINKS = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/jobs/browse", icon: "inventory_2", label: "Jobs" },
  { href: "/jobs/active", icon: "local_shipping", label: "Deliveries" },
  { href: "/wallet", icon: "account_balance_wallet", label: "Wallet" },
  { href: "/settings", icon: "settings", label: "Settings" },
] as const;

// Covers both the Job enum (bicycle) and the DriverProfile enum (bike).
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  bicycle: "Bicycle / Scooter",
  bike: "Bicycle / Scooter",
  car: "Standard Sedan",
  van: "Cargo Van",
  truck: "Box Truck",
};

const VEHICLE_TYPE_ICONS: Record<string, string> = {
  bicycle: "pedal_bike",
  bike: "pedal_bike",
  car: "directions_car",
  van: "local_shipping",
  truck: "fire_truck",
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

const DELIVERY_STAGES = [
  { id: "confirmed", title: "Confirmed", description: "Driver assigned" },
  { id: "picked_up", title: "Picked Up", description: "Package with courier" },
  { id: "on_the_way", title: "On the way", description: "En route to dropoff" },
  { id: "dropoff", title: "Dropoff", description: "Delivered to recipient" },
] as const;

type StageId = (typeof DELIVERY_STAGES)[number]["id"];
type StageState = "completed" | "active" | "pending";

// ── Types ────────────────────────────────────────────────────────────────────
interface JobDetail {
  _id: string;
  posterId: string;
  driverId: string | null;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  vehicleType: JobVehicleType;
  offeredPrice: number;
  pickupDate: string;
  pickupTimeWindow: string;
  createdAt: string;
  updatedAt: string;
}

interface JobLocations {
  pickup: Coordinates | null;
  dropoff: Coordinates | null;
}

interface LocationUpdatePayload {
  lat: number;
  lng: number;
  timestamp: string;
  driverId: string;
}

interface StatusChangePayload {
  status: string;
  timestamp: string;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────
async function fetchJobForTracking(jobId: string): Promise<JobDetail> {
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

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace("_", " ");
}

function getStatusBadgeClass(status: string): string {
  return STATUS_BADGE_STYLES[status] ?? "bg-surface-container text-on-surface-variant";
}

function getStageState(status: string, stageId: StageId): StageState {
  switch (status) {
    case JOB_STATUS.ACCEPTED:
      return stageId === "confirmed" ? "completed" : "pending";
    case JOB_STATUS.IN_TRANSIT:
      if (stageId === "confirmed" || stageId === "picked_up") return "completed";
      if (stageId === "on_the_way") return "active";
      return "pending";
    case JOB_STATUS.DELIVERED:
      return "completed";
    default:
      return "pending";
  }
}

function getStageMeta(stageId: StageId, job: JobDetail): string {
  switch (stageId) {
    case "confirmed":
      return formatAppliedDate(job.createdAt);
    case "picked_up":
      return job.pickupAddress;
    case "on_the_way":
      return job.dropoffAddress;
    case "dropoff":
      return job.status === JOB_STATUS.DELIVERED
        ? formatCompletedDate(job.updatedAt)
        : "Awaiting dropoff";
    default:
      return "";
  }
}

function getTrackingId(jobId: string): string {
  return `SS-${jobId.slice(-JOB_SHORT_ID_CHARS).toUpperCase()}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────
function SidebarLink({
  href,
  icon,
  label,
  isActive,
}: {
  href: string;
  icon: string;
  label: string;
  isActive: boolean;
}) {
  const linkClassName = [
    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer",
    isActive
      ? "bg-primary-container text-on-primary-container"
      : "text-on-surface-variant hover:bg-surface-container-low",
  ].join(" ");

  return (
    <Link href={href} className={linkClassName}>
      <span className="material-symbols-outlined" style={isActive ? FILLED_ICON_STYLE : undefined}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

function SidebarNav({ userName, userRole }: { userName: string; userRole: string }) {
  const initials = getInitials(userName);

  const linkItems = useMemo(
    () =>
      SIDEBAR_LINKS.map((link) => (
        <SidebarLink
          key={link.href}
          href={link.href}
          icon={link.icon}
          label={link.label}
          isActive={link.label === ACTIVE_NAV_LABEL}
        />
      )),
    []
  );

  return (
    <aside className="hidden md:flex flex-col w-64 flex-shrink-0 h-full bg-surface-white border-r border-secondary-container z-20">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined" style={FILLED_ICON_STYLE}>
            local_shipping
          </span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-primary leading-tight">SwiftShip</h1>
          <p className="text-xs font-semibold text-secondary">Delivery Tracker</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">{linkItems}</nav>

      <div className="p-4 border-t border-secondary-container flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate">{userName}</p>
          <p className="text-xs text-on-surface-variant capitalize">{userRole}</p>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader({ trackingId }: { trackingId: string }) {
  return (
    <header className="md:hidden h-12 flex items-center justify-between px-4 bg-surface-white border-b border-secondary-container z-20">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">local_shipping</span>
        <span className="text-base font-bold text-primary">SwiftShip</span>
      </div>
      <span className="text-xs font-semibold text-on-surface-variant">{trackingId}</span>
    </header>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${getStatusBadgeClass(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function StageNode({
  stage,
  state,
  meta,
  isLast,
}: {
  stage: (typeof DELIVERY_STAGES)[number];
  state: StageState;
  meta: string;
  isLast: boolean;
}) {
  const circleClassName =
    state === "completed"
      ? "w-6 h-6 rounded-full bg-success-green text-surface-white flex items-center justify-center"
      : state === "active"
        ? "w-6 h-6 rounded-full bg-surface-white border-2 border-primary flex items-center justify-center"
        : "w-6 h-6 rounded-full bg-surface-white border-2 border-secondary-fixed-dim flex items-center justify-center";

  const titleClassName =
    state === "active"
      ? "text-sm font-semibold text-primary"
      : "text-sm font-medium text-on-surface";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={circleClassName}>
          {state === "completed" && (
            <span className="material-symbols-outlined text-sm" style={FILLED_ICON_STYLE}>
              check
            </span>
          )}
          {state === "active" && (
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        {!isLast && <div className="w-px flex-1 bg-surface-container-high my-1" />}
      </div>
      <div className={isLast ? "" : "pb-6"}>
        <p className={titleClassName}>{stage.title}</p>
        <p className="text-xs text-on-surface-variant mt-0.5">{meta}</p>
      </div>
    </div>
  );
}

function DeliveryProgress({ job }: { job: JobDetail }) {
  const stageItems = useMemo(
    () =>
      DELIVERY_STAGES.map((stage, index) => ({
        stage,
        state: getStageState(job.status, stage.id),
        meta: getStageMeta(stage.id, job),
        isLast: index === DELIVERY_STAGES.length - 1,
      })),
    [job]
  );

  return (
    <div>
      <h3 className="text-sm font-semibold text-on-surface mb-4">Delivery Progress</h3>
      <div className="flex flex-col">
        {stageItems.map((item) => (
          <StageNode
            key={item.stage.id}
            stage={item.stage}
            state={item.state}
            meta={item.meta}
            isLast={item.isLast}
          />
        ))}
      </div>
    </div>
  );
}

function CourierCard({
  driverName,
  ratingAvgDisplay,
  vehicleLabel,
  vehicleIcon,
}: {
  driverName: string;
  ratingAvgDisplay: string;
  vehicleLabel: string;
  vehicleIcon: string;
}) {
  const initials = getInitials(driverName);

  return (
    <div className="border border-secondary-container rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-container/15 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-primary">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate">{driverName}</p>
          <p className="text-xs text-on-surface-variant mt-0.5 truncate">
            {vehicleIcon && (
              <span className="material-symbols-outlined text-[14px] align-text-bottom mr-1">
                {vehicleIcon}
              </span>
            )}
            {vehicleLabel} • {ratingAvgDisplay} ★
          </p>
        </div>
        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center rounded-lg border border-secondary-container text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer flex-shrink-0"
        >
          <span className="material-symbols-outlined">chat</span>
        </button>
      </div>
    </div>
  );
}

function MapPlaceholder({
  status,
  isGeocoding,
}: {
  status: string;
  isGeocoding: boolean;
}) {
  const isDelivered = status === JOB_STATUS.DELIVERED;
  const isCancelled = status === JOB_STATUS.CANCELLED;

  const iconName = isGeocoding
    ? "map"
    : isDelivered
      ? "check_circle"
      : isCancelled
        ? "cancel"
        : "schedule";
  const title = isGeocoding
    ? "Locating pickup point"
    : isDelivered
      ? "Delivery completed"
      : isCancelled
        ? "Delivery cancelled"
        : "Waiting for a driver";
  const description = isGeocoding
    ? "Preparing the live map..."
    : isDelivered
      ? "This delivery has been completed."
      : isCancelled
        ? "This delivery was cancelled."
        : "Live tracking starts once a driver accepts the job.";

  return (
    <div className="absolute inset-0 bg-surface-container-low flex items-center justify-center z-0">
      <div className="text-center p-8 max-w-sm">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4 block">
          {iconName}
        </span>
        <h2 className="text-lg font-semibold text-on-surface mb-2">{title}</h2>
        <p className="text-sm text-on-surface-variant">{description}</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function TrackJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  const [liveDriverLocation, setLiveDriverLocation] = useState<Coordinates | null>(null);
  const [livePingTime, setLivePingTime] = useState<string | null>(null);

  const lastRouteOriginRef = useRef<Coordinates | null>(null);
  const [debouncedRouteOrigin, setDebouncedRouteOrigin] = useState<Coordinates | null>(null);

  const {
    data: job,
    isLoading: isJobLoading,
    isError: isJobError,
  } = useQuery({
    queryKey: [JOB_DETAIL_QUERY_KEY, id],
    queryFn: () => fetchJobForTracking(id),
    retry: false,
    enabled: !isAuthLoading,
  });

  const { data: jobLocations, isLoading: isGeocoding } = useQuery({
    queryKey: [GEOCODE_QUERY_KEY, job?._id],
    queryFn: () => geocodeJobLocations(job!),
    enabled: !!job,
    retry: false,
  });

  const { data: driverProfileData } = useDriverPublicProfile(job?.driverId ?? null);

  const pickupLat = jobLocations?.pickup?.lat ?? FALLBACK_LAT;
  const pickupLng = jobLocations?.pickup?.lng ?? FALLBACK_LNG;
  const dropoffLat = jobLocations?.dropoff?.lat;
  const dropoffLng = jobLocations?.dropoff?.lng;

  const trackingId = useMemo(() => getTrackingId(id), [id]);

  const isMapVisible =
    !!job && (job.status === JOB_STATUS.ACCEPTED || job.status === JOB_STATUS.IN_TRANSIT);

  const pickupCoords = jobLocations?.pickup ?? null;
  const dropoffCoords = jobLocations?.dropoff ?? null;

  // Initialize the debounced route origin from the geocoded pickup once.
  useEffect(() => {
    if (pickupCoords && !lastRouteOriginRef.current) {
      lastRouteOriginRef.current = pickupCoords;
      setDebouncedRouteOrigin(pickupCoords);
    }
  }, [pickupCoords]);

  const { data: routeData } = useQuery({
    queryKey: [ROUTE_QUERY_KEY, id, debouncedRouteOrigin?.lat, debouncedRouteOrigin?.lng],
    queryFn: () => fetchRoute(debouncedRouteOrigin!, dropoffCoords!),
    enabled: isMapVisible && !!debouncedRouteOrigin && !!dropoffCoords,
    retry: false,
  });

  const driverName = driverProfileData?.user?.name ?? "Unassigned";
  const driverRatingAvg = driverProfileData?.profile?.ratingAvg ?? 0;
  const ratingAvgDisplay =
    driverRatingAvg > 0 ? driverRatingAvg.toFixed(1) : "—";
  const driverVehicleType = driverProfileData?.profile?.vehicleType;
  const courierVehicleType = driverVehicleType ?? job?.vehicleType ?? "";
  const vehicleLabel = VEHICLE_TYPE_LABELS[courierVehicleType] ?? "";
  const vehicleIcon = VEHICLE_TYPE_ICONS[courierVehicleType] ?? "";

  const handleCallDriver = useCallback(() => {
    window.location.href = "tel:";
  }, []);

  const handleSupport = useCallback(() => {
    window.location.href = "tel:";
  }, []);

  const handleLocationUpdate = useCallback((data: LocationUpdatePayload) => {
    const newLocation: Coordinates = { lat: data.lat, lng: data.lng };
    setLiveDriverLocation(newLocation);
    setLivePingTime(data.timestamp);

    if (lastRouteOriginRef.current) {
      const distance = haversineDistanceMeters(lastRouteOriginRef.current, newLocation);
      if (distance >= ROUTE_DEBOUNCE_DISTANCE_M) {
        lastRouteOriginRef.current = newLocation;
        setDebouncedRouteOrigin(newLocation);
      }
    }
  }, []);

  const statusChangeCallbackRef = useRef<(data: StatusChangePayload) => void>(() => {});

  // Keep the ref fresh so the Pusher subscription always calls the latest handler
  // without resubscribing on every job state change.
  useEffect(() => {
    statusChangeCallbackRef.current = (data) => {
      queryClient.setQueryData<JobDetail>([JOB_DETAIL_QUERY_KEY, id], (oldJob) =>
        oldJob
          ? { ...oldJob, status: data.status, updatedAt: data.timestamp }
          : oldJob
      );
    };
  }, [id, queryClient]);

  // Subscribe to status-change so the badge, stepper and map unlock live.
  useEffect(() => {
    // The channel subscription should only depend on id and queryClient
    // We remove job from dependencies to prevent resubscription on every status change
    const channelName = `${PRIVATE_CHANNEL_PREFIX}${id}`;
    let pusherClientRef: PusherJs | null = null;
    let channel: Channel | null = null;

    import("@/lib/pusherClient").then(({ pusherClient }) => {
      pusherClientRef = pusherClient;
      channel = pusherClient.subscribe(channelName);
      channel.bind(STATUS_CHANGE_EVENT, (data: StatusChangePayload) => {
        statusChangeCallbackRef.current(data);
      });
    });

    return () => {
      if (channel && pusherClientRef) {
        channel.unbind_all();
        pusherClientRef.unsubscribe(channelName);
      }
    };
  }, [id, queryClient]);

  // ETA / distance / arrival render only once real route data exists — no
  // hardcoded placeholders, so the row stays hidden until the route resolves.
  const routeEtaTitle = routeData ? formatEtaLabel(routeData.durationS) : null;
  const routeDistanceLabel = routeData ? formatDistanceMiles(routeData.distanceM) : null;
  const routeArrivalLabel =
    routeData && livePingTime
      ? `Est. ${formatArrivalTime(
          new Date(new Date(livePingTime).getTime() + routeData.durationS * 1000).toISOString()
        )}`
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
            href="/jobs/active"
            className="text-sm font-semibold text-primary hover:underline cursor-pointer"
          >
            ← Back to Deliveries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-surface-container-low">
      <SidebarNav userName={user?.name ?? "Guest"} userRole={user?.role ?? "poster"} />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader trackingId={trackingId} />

        <main className="flex-1 relative overflow-hidden">
          {isMapVisible && !isGeocoding ? (
            <LiveTrackingMap
              jobId={id}
              initialLat={pickupLat}
              initialLng={pickupLng}
              pickupLat={pickupLat}
              pickupLng={pickupLng}
              dropoffLat={dropoffLat}
              dropoffLng={dropoffLng}
              routePath={routeData?.path ?? null}
              vehiclePosition={liveDriverLocation}
              onLocationUpdate={handleLocationUpdate}
            />
          ) : (
            <MapPlaceholder status={job.status} isGeocoding={isGeocoding} />
          )}

          <div className="absolute inset-x-0 bottom-0 z-10 md:inset-auto md:top-6 md:right-6 md:w-[400px] md:max-h-[calc(100vh-3rem)] bg-surface-white md:rounded-xl shadow-lg border border-secondary-container flex flex-col">
            <div className="bg-surface-bright p-6 border-b border-surface-container-high">
              <div className="flex items-start justify-between gap-3">
                {routeEtaTitle && (
                  <div>
                    <h2 className="text-xl font-semibold text-on-surface leading-tight">
                      {routeEtaTitle}
                    </h2>
                    {routeDistanceLabel && (
                      <p className="text-sm text-secondary mt-1">{routeDistanceLabel}</p>
                    )}
                  </div>
                )}
                <StatusBadge status={job.status} />
              </div>
              <div className="flex gap-4 mt-4 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">tag</span>
                  {trackingId}
                </span>
                {routeArrivalLabel && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {routeArrivalLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <CourierCard
                driverName={driverName}
                ratingAvgDisplay={ratingAvgDisplay}
                vehicleLabel={vehicleLabel}
                vehicleIcon={vehicleIcon}
              />

              <DeliveryProgress job={job} />
            </div>

            <div className="p-6 border-t border-secondary-container bg-surface-white flex gap-3">
              <button
                type="button"
                onClick={handleSupport}
                className="flex-1 h-12 flex items-center justify-center gap-2 rounded-lg bg-surface-white border border-secondary-container text-on-surface text-sm font-semibold hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">help</span>
                Support
              </button>
              <button
                type="button"
                onClick={handleCallDriver}
                className="flex-1 h-12 flex items-center justify-center gap-2 rounded-lg bg-primary-container text-on-primary-container text-sm font-semibold hover:bg-surface-tint transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">call</span>
                Call Driver
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
