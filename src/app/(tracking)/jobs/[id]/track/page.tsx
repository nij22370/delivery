"use client";

import { use, useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type PusherJs from "pusher-js";
import type { Channel } from "pusher-js";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { apiFetch } from "@/utils/apiFetch";
import { useDriverPublicProfile } from "@/api/hooks/drivers/driverPublicProfileApi";
import { geocodeAddress } from "@/utils/geocode";
import type { Coordinates } from "@/utils/geocode";
import { fetchRoute, haversineDistanceMeters, interpolateAlongPath } from "@/utils/routing";
import { createThrottle } from "@/utils/throttle";
import {
  getInitials,
  formatDistanceMiles,
  formatArrivalTime,
  formatEtaLabel,
} from "@/utils/format";
import { JOB_STATUS } from "@/types/job";
import type { JobVehicleType } from "@/types/job";
import DriverTrackingPanel from "@/components/tracking/DriverTrackingPanel";
import PosterTrackingPanel from "@/components/tracking/PosterTrackingPanel";

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
const FILLED_ICON_STYLE = { fontVariationSettings: "'FILL' 1" } as const;
const POSTER_ROLE_CONST = "poster";
const DRIVER_ROLE_CONST = "driver";
const TRACK_ACTIVE_HREF = "/tracking";
const POST_JOB_HREF = "/post-job";

// Driver GPS simulation constants
const GPS_PING_INTERVAL_MS = 10_000;
const SIMULATION_TICK_MS = 1_000;
const SIMULATION_STEPS = 40;

interface TrackNavLink {
  href: string;
  icon: string;
  label: string;
  roles: readonly string[];
}

const TRACK_NAV_LINKS: readonly TrackNavLink[] = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard", roles: [POSTER_ROLE_CONST, DRIVER_ROLE_CONST] },
  { href: "/jobs/active", icon: "local_shipping", label: "Active Deliveries", roles: [POSTER_ROLE_CONST, DRIVER_ROLE_CONST] },
  { href: "/tracking", icon: "location_on", label: "Tracking", roles: [POSTER_ROLE_CONST] },
  { href: "/tracking", icon: "location_on", label: "Tracking", roles: [DRIVER_ROLE_CONST] },
  { href: "/analytics", icon: "bar_chart", label: "Analytics", roles: [POSTER_ROLE_CONST] },
  { href: "/billing", icon: "receipt_long", label: "Billing", roles: [POSTER_ROLE_CONST] },
  { href: "/post-job", icon: "add_box", label: "Post Job", roles: [POSTER_ROLE_CONST] },
  { href: "/driver/earnings", icon: "payments", label: "Earnings", roles: [DRIVER_ROLE_CONST] },
  { href: "/driver/payouts", icon: "account_balance_wallet", label: "Wallet", roles: [DRIVER_ROLE_CONST] },
  { href: "/driver/verification", icon: "verified_user", label: "Verification", roles: [DRIVER_ROLE_CONST] },
  { href: "/disputes", icon: "gavel", label: "Disputes", roles: [POSTER_ROLE_CONST, DRIVER_ROLE_CONST] },
  { href: "/history", icon: "history", label: "History", roles: [POSTER_ROLE_CONST, DRIVER_ROLE_CONST] },
];

const TRACK_FOOTER_LINKS = [
  { href: "/settings", icon: "settings", label: "Settings" },
  { href: "/faq", icon: "help", label: "FAQ" },
  { href: "/support", icon: "contact_support", label: "Support" },
] as const;

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  bike: "Bike / Scooter",
  car: "Standard Sedan",
  van: "Cargo Van",
  truck: "Box Truck",
};

const VEHICLE_TYPE_ICONS: Record<string, string> = {
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

// ── Types ────────────────────────────────────────────────────────────────────
interface JobDetail {
  _id: string;
  posterId: string;
  driverId: string | null;
  status: string;
  pickupAddress: string;
  pickupPhone?: string;
  dropoffAddress: string;
  dropoffPhone?: string;
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

function getTrackingId(jobId: string): string {
  return `SS-${jobId.slice(-JOB_SHORT_ID_CHARS).toUpperCase()}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────
function SidebarNav({ userName, userRole }: { userName: string; userRole: string }) {
  const initials = getInitials(userName);

  const linkItems = useMemo(() => {
    const visibleLinks = TRACK_NAV_LINKS.filter((link) =>
      link.roles.includes(userRole)
    );
    return visibleLinks.map((link) => {
      const isActive = link.href === TRACK_ACTIVE_HREF;
      return (
        <li key={link.href}>
          <Link
            href={link.href}
            className={[
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary-container text-on-primary-container font-bold"
                : "text-secondary hover:bg-surface-container-high",
            ].join(" ")}
          >
            <span
              className="material-symbols-outlined"
              style={isActive ? FILLED_ICON_STYLE : undefined}
            >
              {link.icon}
            </span>
            {link.label}
          </Link>
        </li>
      );
    });
  }, [userRole]);

  return (
    <aside className="hidden md:flex flex-col w-64 flex-shrink-0 h-full bg-surface-white border-r border-secondary-container z-20">
      <div className="flex items-center gap-3 mb-8 px-5 py-5">
        <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
          <span className="material-symbols-outlined" style={FILLED_ICON_STYLE}>
            local_shipping
          </span>
        </div>
        <div>
          <h1 className="text-[16px] font-bold text-primary leading-tight">SwiftShip Fleet</h1>
          <p className="text-xs font-semibold text-secondary">Verified Logistics Partner</p>
        </div>
      </div>

      {userRole === POSTER_ROLE_CONST && (
        <div className="px-4 mb-6">
          <Link
            href={POST_JOB_HREF}
            className="w-full bg-primary-container hover:bg-primary-container/90 text-on-primary-container text-sm font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined" style={FILLED_ICON_STYLE}>
              add_box
            </span>
            New Shipment
          </Link>
        </div>
      )}

      <nav className="flex-1 px-3">
        <ul className="flex flex-col gap-1">{linkItems}</ul>
      </nav>

      <div className="mt-auto border-t border-secondary-container">
        <ul className="flex flex-col gap-1 px-3 pt-4">
          {TRACK_FOOTER_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-secondary hover:bg-surface-container-high transition-all duration-200"
              >
                <span className="material-symbols-outlined">{link.icon}</span>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="p-4 border-t border-secondary-container flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">{userName}</p>
            <p className="text-xs text-on-surface-variant capitalize">{userRole}</p>
          </div>
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  const [liveDriverLocation, setLiveDriverLocation] = useState<Coordinates | null>(null);
  const [livePingTime, setLivePingTime] = useState<string | null>(null);

  const lastRouteOriginRef = useRef<Coordinates | null>(null);
  const [debouncedRouteOrigin, setDebouncedRouteOrigin] = useState<Coordinates | null>(null);

  // ── Driver execution state ────────────────────────────────────────────────
  const [isSimulating, setIsSimulating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const simulationProgressRef = useRef(0);
  const throttledPing = useMemo(() => createThrottle(GPS_PING_INTERVAL_MS), []);
  const isGeolocationSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

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

  const handleChatClick = useCallback(() => {
    router.push(`/jobs/${id}/chat`);
  }, [router, id]);

  const handleCallDriver = useCallback(() => {
    const driverPhone = driverProfileData?.user?.phone || driverProfileData?.profile?.phone;
    if (driverPhone) {
      window.location.href = `tel:${driverPhone}`;
    } else if (job?.pickupPhone || job?.dropoffPhone) {
      window.location.href = `tel:${job?.pickupPhone || job?.dropoffPhone}`;
    }
  }, [driverProfileData, job?.pickupPhone, job?.dropoffPhone]);

  const handleSupport = useCallback(() => {
    router.push("/support");
  }, [router]);

  // ── Driver GPS ping helper ────────────────────────────────────────────────
  const sendLocationPing = useCallback(
    async (position: Coordinates) => {
      try {
        await apiFetch(`${JOB_ENDPOINT_BASE}/${id}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: position.lat, lng: position.lng }),
        });
      } catch {
        // fire-and-forget
      }
    },
    [id]
  );

  const handleDriverPositionUpdate = useCallback(
    (position: Coordinates) => {
      setLiveDriverLocation(position);
      throttledPing(() => {
        void sendLocationPing(position);
      });
    },
    [throttledPing, sendLocationPing]
  );

  // ── Driver status mutations ───────────────────────────────────────────────
  const transitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch(`${JOB_ENDPOINT_BASE}/${id}/transit`, { method: "POST" });
      if (!response.ok) {
        const errorData: { message?: string } = await response.json().catch(() => ({}));
        throw new Error(errorData.message ?? "Failed to start delivery.");
      }
      return response.json() as Promise<{ job: JobDetail }>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([JOB_DETAIL_QUERY_KEY, id], data.job);
    },
  });

  const deliverMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch(`${JOB_ENDPOINT_BASE}/${id}/deliver`, { method: "POST" });
      if (!response.ok) {
        const errorData: { message?: string } = await response.json().catch(() => ({}));
        throw new Error(errorData.message ?? "Failed to mark delivered.");
      }
      return response.json() as Promise<{ job: JobDetail }>;
    },
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
    setIsSimulating((prev) => {
      simulationProgressRef.current = 0;
      return !prev;
    });
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

  // ── Driver live GPS (when driver is viewing their own job in transit) ───────
  useEffect(() => {
    const isAssignedDriver =
      user?.role === DRIVER_ROLE_CONST && user?._id === job?.driverId;
    if (!isAssignedDriver || job?.status !== JOB_STATUS.IN_TRANSIT || isSimulating) return;
    if (!isGeolocationSupported) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        handleDriverPositionUpdate({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        setGpsError(`GPS unavailable (${error.message}) — use Simulate GPS.`);
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 10_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, job?.driverId, job?.status, isSimulating, handleDriverPositionUpdate, isGeolocationSupported]);

  // ── GPS simulation for driver ─────────────────────────────────────────────
  useEffect(() => {
    if (!isSimulating || !routeData || job?.status !== JOB_STATUS.IN_TRANSIT) return;
    const intervalId = setInterval(() => {
      simulationProgressRef.current += 1 / SIMULATION_STEPS;
      if (simulationProgressRef.current >= 1) {
        simulationProgressRef.current = 1;
        clearInterval(intervalId);
        const endPoint = routeData.path[routeData.path.length - 1];
        if (endPoint) {
          const end = { lat: endPoint[0], lng: endPoint[1] };
          setLiveDriverLocation(end);
          throttledPing(() => void sendLocationPing(end));
        }
        return;
      }
      handleDriverPositionUpdate(
        interpolateAlongPath(routeData.path, simulationProgressRef.current)
      );
    }, SIMULATION_TICK_MS);
    return () => clearInterval(intervalId);
  }, [isSimulating, routeData, job?.status, handleDriverPositionUpdate, throttledPing, sendLocationPing]);

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

  // Determine if this user is the assigned driver for this job
  const isAssignedDriver =
    !isAuthLoading &&
    user?.role === DRIVER_ROLE_CONST &&
    !!job?.driverId &&
    user?._id === job?.driverId;

  const isAccepted = job?.status === JOB_STATUS.ACCEPTED;
  const isInTransit = job?.status === JOB_STATUS.IN_TRANSIT;
  const isDelivered = job?.status === JOB_STATUS.DELIVERED;

  const gpsIndicatorLabel = isSimulating
    ? "Simulating GPS"
    : gpsError
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
            href="/tracking"
            className="text-sm font-semibold text-primary hover:underline cursor-pointer"
          >
            ← Back to Tracking
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
              {isAssignedDriver ? (
                <DriverTrackingPanel
                  jobId={id}
                  job={job}
                  isAccepted={isAccepted}
                  isInTransit={isInTransit}
                  isDelivered={isDelivered}
                  gpsIndicatorLabel={gpsIndicatorLabel}
                  isSimulating={isSimulating}
                  mutationError={mutationError}
                  gpsError={gpsError}
                  handleStartDelivery={handleStartDelivery}
                  handleMarkDelivered={handleMarkDelivered}
                  handleToggleSimulation={handleToggleSimulation}
                  handleSupport={handleSupport}
                  transitMutationPending={transitMutation.isPending}
                  deliverMutationPending={deliverMutation.isPending}
                />
              ) : (
                <PosterTrackingPanel
                  jobId={id}
                  job={job}
                  driverName={driverName}
                  ratingAvgDisplay={ratingAvgDisplay}
                  vehicleLabel={vehicleLabel}
                  vehicleIcon={vehicleIcon}
                  handleChatClick={handleChatClick}
                />
              )}
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
              {isAssignedDriver ? (
                <Link
                  href={`/jobs/${id}/chat`}
                  className="flex-1 h-12 flex items-center justify-center gap-2 rounded-lg bg-primary-container text-on-primary-container text-sm font-semibold hover:bg-surface-tint transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">chat</span>
                  Chat Poster
                </Link>
              ) : job.status === JOB_STATUS.DELIVERED ? (
                <Link
                  href={`/jobs/${id}/rate`}
                  className="flex-1 h-12 flex items-center justify-center gap-2 rounded-lg bg-amber-400 text-amber-950 font-bold text-sm hover:bg-amber-300 transition-colors cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-xl">star</span>
                  Rate Delivery
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleCallDriver}
                  className="flex-1 h-12 flex items-center justify-center gap-2 rounded-lg bg-primary-container text-on-primary-container text-sm font-semibold hover:bg-surface-tint transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">call</span>
                  Call Driver
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
