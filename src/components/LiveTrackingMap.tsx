"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import type PusherJs from "pusher-js";
import type { Channel } from "pusher-js";
import "leaflet/dist/leaflet.css";
import { ROUTE_POLYLINE_STYLE } from "@/utils/routing";

// ── Constants ────────────────────────────────────────────────────────────────
const MAP_ZOOM = 13;
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const DEFAULT_ICON_URL = "/leaflet/marker-icon.png";
const DEFAULT_ICON_RETINA_URL = "/leaflet/marker-icon-2x.png";
const DEFAULT_ICON_SHADOW_URL = "/leaflet/marker-shadow.png";

const LOCATION_UPDATE_EVENT = "location-update";
const PRIVATE_CHANNEL_PREFIX = "private-job-";

const BOUNDS_PADDING: [number, number] = [50, 50];
const BOUNDS_FIT_DURATION = 1;

const PICKUP_PILL_WIDTH = 92;
const PICKUP_PILL_HEIGHT = 34;
const VEHICLE_SIZE = 36;
const DROPOFF_PILL_WIDTH = 100;
const DROPOFF_PILL_HEIGHT = 34;

const PICKUP_ICON_HTML = `
  <div style="display:flex;align-items:center;gap:6px;width:${PICKUP_PILL_WIDTH}px;height:${PICKUP_PILL_HEIGHT}px;background:#ffffff;border-radius:17px;padding:0 10px;box-shadow:0 2px 6px rgba(0,0,0,0.2);white-space:nowrap;justify-content:center;">
    <span class="material-symbols-outlined" style="font-size:16px;color:#05A357;">store</span>
    <span style="font-size:12px;font-weight:700;color:#05A357;">PICKUP</span>
  </div>`;

const DROPOFF_ICON_HTML = `
  <div style="display:flex;align-items:center;gap:6px;width:${DROPOFF_PILL_WIDTH}px;height:${DROPOFF_PILL_HEIGHT}px;background:#ffffff;border-radius:17px;padding:0 10px;box-shadow:0 2px 6px rgba(0,0,0,0.2);white-space:nowrap;justify-content:center;">
    <span class="material-symbols-outlined" style="font-size:16px;color:#05A357;">flag</span>
    <span style="font-size:12px;font-weight:700;color:#05A357;">DROPOFF</span>
  </div>`;

const VEHICLE_ICON_HTML = `
  <div style="position:relative;width:${VEHICLE_SIZE}px;height:${VEHICLE_SIZE}px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:#276EF1;opacity:0.3;animation:swiftship-pulse 2s infinite;"></div>
    <div style="position:absolute;inset:7px;border-radius:50%;background:#276EF1;display:flex;align-items:center;justify-content:center;color:#ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
      <span class="material-symbols-outlined" style="font-size:16px;">local_shipping</span>
    </div>
  </div>`;

// ── Types ────────────────────────────────────────────────────────────────────
interface LiveTrackingMapProps {
  jobId: string;
  initialLat: number;
  initialLng: number;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  routePath?: [number, number][] | null;
  vehiclePosition?: { lat: number; lng: number } | null;
  onLocationUpdate?: (data: LocationUpdatePayload) => void;
}

interface LocationUpdatePayload {
  lat: number;
  lng: number;
  timestamp: string;
  driverId: string;
}

// ── Default icon fix (Leaflet assets copied to public/leaflet/) ──────────────
L.Icon.Default.mergeOptions({
  iconUrl: DEFAULT_ICON_URL,
  iconRetinaUrl: DEFAULT_ICON_RETINA_URL,
  shadowUrl: DEFAULT_ICON_SHADOW_URL,
});

// ── Sub-components ───────────────────────────────────────────────────────────
function MapReadyHandler({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

// Fit the view to the full route once it loads; never re-fit on live movement
// so the map is not yanked while the vehicle advances.
function RouteBoundsUpdater({
  pickupPosition,
  dropoffPosition,
  routePath,
}: {
  pickupPosition: [number, number] | undefined;
  dropoffPosition: [number, number] | undefined;
  routePath?: [number, number][] | null;
}) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (hasFittedRef.current) return;
    if (!routePath || routePath.length === 0) return;

    const bounds = L.latLngBounds([]);
    routePath.forEach((coord) => bounds.extend(coord));
    if (pickupPosition) bounds.extend(pickupPosition);
    if (dropoffPosition) bounds.extend(dropoffPosition);
    map.fitBounds(bounds, { padding: BOUNDS_PADDING, duration: BOUNDS_FIT_DURATION });
    hasFittedRef.current = true;
  }, [routePath, pickupPosition, dropoffPosition, map]);

  return null;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function LiveTrackingMap({
  jobId,
  initialLat,
  initialLng,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  routePath,
  vehiclePosition,
  onLocationUpdate,
}: LiveTrackingMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const channelName = useMemo(() => `${PRIVATE_CHANNEL_PREFIX}${jobId}`, [jobId]);

  const vehicleStartLat = vehiclePosition?.lat ?? initialLat;
  const vehicleStartLng = vehiclePosition?.lng ?? initialLng;

  const pickupPosition: [number, number] | undefined =
    pickupLat !== undefined && pickupLng !== undefined
      ? [pickupLat, pickupLng]
      : undefined;
  const dropoffPosition: [number, number] | undefined =
    dropoffLat !== undefined && dropoffLng !== undefined
      ? [dropoffLat, dropoffLng]
      : undefined;

  const pickupIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: PICKUP_ICON_HTML,
        iconSize: [PICKUP_PILL_WIDTH, PICKUP_PILL_HEIGHT],
        iconAnchor: [PICKUP_PILL_WIDTH / 2, PICKUP_PILL_HEIGHT],
      }),
    []
  );

  const dropoffIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: DROPOFF_ICON_HTML,
        iconSize: [DROPOFF_PILL_WIDTH, DROPOFF_PILL_HEIGHT],
        iconAnchor: [DROPOFF_PILL_WIDTH / 2, DROPOFF_PILL_HEIGHT],
      }),
    []
  );

  const vehicleIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: VEHICLE_ICON_HTML,
        iconSize: [VEHICLE_SIZE, VEHICLE_SIZE],
        iconAnchor: [VEHICLE_SIZE / 2, VEHICLE_SIZE / 2],
      }),
    []
  );

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  const handleLocationUpdate = useCallback(
    (data: LocationUpdatePayload) => {
      markerRef.current?.setLatLng([data.lat, data.lng]);
      onLocationUpdate?.(data);
    },
    [onLocationUpdate]
  );

  // Drive the marker directly from a controlled position prop (driver's own
  // GPS) so local movement does not depend on the Pusher round-trip.
  useEffect(() => {
    if (vehiclePosition) {
      markerRef.current?.setLatLng([vehiclePosition.lat, vehiclePosition.lng]);
    }
  }, [vehiclePosition]);

  // Subscribe to the job's private channel for location updates.
  useEffect(() => {
    let pusherClientRef: PusherJs | null = null;
    let channel: Channel | null = null;

    import("@/lib/pusherClient").then(({ pusherClient }) => {
      pusherClientRef = pusherClient;
      channel = pusherClient.subscribe(channelName);
      channel.bind(LOCATION_UPDATE_EVENT, handleLocationUpdate);
    });

    return () => {
      if (channel && pusherClientRef) {
        channel.unbind_all();
        pusherClientRef.unsubscribe(channelName);
      }
    };
  }, [channelName, handleLocationUpdate]);

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[initialLat, initialLng]}
        zoom={MAP_ZOOM}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer url={TILE_URL} />

        {routePath && (
          <Polyline positions={routePath} pathOptions={ROUTE_POLYLINE_STYLE} />
        )}

        {pickupPosition && (
          <Marker position={pickupPosition} icon={pickupIcon} />
        )}
        {dropoffPosition && (
          <Marker position={dropoffPosition} icon={dropoffIcon} />
        )}

        <Marker
          ref={markerRef}
          position={[vehicleStartLat, vehicleStartLng]}
          icon={vehicleIcon}
        />

        <RouteBoundsUpdater
          pickupPosition={pickupPosition}
          dropoffPosition={dropoffPosition}
          routePath={routePath}
        />

        <MapReadyHandler onReady={handleMapReady} />
      </MapContainer>
    </div>
  );
}
