import type { Coordinates } from "@/utils/geocode";

// ── Constants ────────────────────────────────────────────────────────────────
const OSRM_ROUTE_ENDPOINT =
  "https://router.project-osrm.org/route/v1/driving/{coordinates}?overview=full&geometries=geojson";

const EARTH_RADIUS_METERS = 6371000;
const DEGREES_TO_RADIANS = Math.PI / 180;

// Shared polyline style for the route overlay (matches the job-detail map).
export const ROUTE_POLYLINE_STYLE = {
  color: "#0066FF",
  weight: 4,
  lineCap: "round" as const,
  lineJoin: "round" as const,
};

// ── Types ────────────────────────────────────────────────────────────────────
export interface RouteResult {
  path: [number, number][];
  distanceM: number;
  durationS: number;
}

interface OsrmResponse {
  routes?: Array<{
    geometry: { coordinates: [number, number][] };
    distance: number;
    duration: number;
  }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function haversineDistanceMeters(start: Coordinates, end: Coordinates): number {
  const lat1 = start.lat * DEGREES_TO_RADIANS;
  const lat2 = end.lat * DEGREES_TO_RADIANS;
  const deltaLat = (end.lat - start.lat) * DEGREES_TO_RADIANS;
  const deltaLng = (end.lng - start.lng) * DEGREES_TO_RADIANS;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

// OSRM returns a GeoJSON LineString with [lng, lat] pairs; Leaflet wants [lat, lng].
export async function fetchRoute(
  start: Coordinates,
  end: Coordinates
): Promise<RouteResult | null> {
  try {
    const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    const response = await fetch(
      OSRM_ROUTE_ENDPOINT.replace("{coordinates}", coordinates)
    );
    const data: OsrmResponse = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const path: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng]
      );
      return { path, distanceM: route.distance, durationS: route.duration };
    }
  } catch (error: unknown) {
    console.error("Routing error:", error);
  }
  return null;
}

// Interpolate a position at a fraction (0..1) along the route, weighted by
// the haversine length of each segment. Used by the GPS simulation.
export function interpolateAlongPath(
  path: [number, number][],
  progress: number
): Coordinates {
  if (path.length === 0) return { lat: 0, lng: 0 };
  if (path.length === 1) return { lat: path[0][0], lng: path[0][1] };

  const clampedProgress = clamp(progress, 0, 1);

  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let index = 0; index < path.length - 1; index++) {
    const start = path[index];
    const end = path[index + 1];
    const segmentLength = haversineDistanceMeters(
      { lat: start[0], lng: start[1] },
      { lat: end[0], lng: end[1] }
    );
    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }

  if (totalLength === 0) return { lat: path[0][0], lng: path[0][1] };

  const targetLength = clampedProgress * totalLength;
  let accumulatedLength = 0;
  for (let index = 0; index < segmentLengths.length; index++) {
    const segmentLength = segmentLengths[index];
    if (accumulatedLength + segmentLength >= targetLength) {
      const segmentProgress =
        segmentLength === 0 ? 0 : (targetLength - accumulatedLength) / segmentLength;
      const start = path[index];
      const end = path[index + 1];
      return {
        lat: start[0] + (end[0] - start[0]) * segmentProgress,
        lng: start[1] + (end[1] - start[1]) * segmentProgress,
      };
    }
    accumulatedLength += segmentLength;
  }

  const last = path[path.length - 1];
  return { lat: last[0], lng: last[1] };
}
