"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_MARKER_ICON } from "@/utils/mapIcons";

// ── Constants ────────────────────────────────────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [37.0902, -95.7129]; // USA
const DEBOUNCE_MS = 500;
const USER_AGENT = "swiftship-dev/1.0";

const PAUSE_PADDING: [number, number] = [50, 50];
const PAUSE_DURATION = 1;
const MAP_ZOOM_CLOSED = 12;
const MAP_ZOOM_DEFAULT = 3;

const ROUTE_PATH_OPTIONS = {
  color: "#0066FF",
  weight: 4,
  lineCap: "round" as const,
  lineJoin: "round" as const,
};

// ── Types ────────────────────────────────────────────────────────────────────
interface MapPreviewProps {
  pickupAddress: string;
  dropoffAddress: string;
}

interface Coords {
  lat: number;
  lng: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function geocodeAddress(address: string): Promise<Coords | null> {
  if (!address) return null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        address
      )}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": USER_AGENT,
        },
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (err: unknown) {
    console.error("Geocoding error:", err);
  }
  return null;
}

async function fetchRoute(start: Coords, end: Coords): Promise<[number, number][] | null> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    );
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      // OSRM returns GeoJSON line string with [lng, lat] coordinates
      const coords = data.routes[0].geometry.coordinates as [number, number][];
      // Leaflet Polyline expects [lat, lng]
      return coords.map(([lng, lat]) => [lat, lng]);
    }
  } catch (err: unknown) {
    console.error("Routing error:", err);
  }
  return null;
}

function buildPosition(coords: Coords | null): [number, number] | undefined {
  return coords ? [coords.lat, coords.lng] : undefined;
}

// ── Sub-component for updating map bounds ──────────────────────────────────────
function MapBoundsUpdater({
  pickupCoords,
  dropoffCoords,
  routePath,
}: {
  pickupCoords: Coords | null;
  dropoffCoords: Coords | null;
  routePath: [number, number][] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const bounds = L.latLngBounds([
        [pickupCoords.lat, pickupCoords.lng],
        [dropoffCoords.lat, dropoffCoords.lng],
      ]);
      if (routePath && routePath.length > 0) {
        routePath.forEach((coord) => bounds.extend(coord));
      }
      map.fitBounds(bounds, { padding: PAUSE_PADDING, duration: PAUSE_DURATION });
    } else if (pickupCoords) {
      map.flyTo([pickupCoords.lat, pickupCoords.lng], MAP_ZOOM_CLOSED);
    } else if (dropoffCoords) {
      map.flyTo([dropoffCoords.lat, dropoffCoords.lng], MAP_ZOOM_CLOSED);
    }
  }, [pickupCoords, dropoffCoords, routePath, map]);

  return null;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function MapPreview({ pickupAddress, dropoffAddress }: MapPreviewProps) {
  // Debounced input states
  const [debouncedPickup, setDebouncedPickup] = useState(pickupAddress);
  const [debouncedDropoff, setDebouncedDropoff] = useState(dropoffAddress);

  // Resolved coordinates and route
  const [pickupCoords, setPickupCoords] = useState<Coords | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<Coords | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPickup(pickupAddress);
      setDebouncedDropoff(dropoffAddress);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [pickupAddress, dropoffAddress]);

  // Geocode effect
  useEffect(() => {
    let isActive = true;

    async function updateLocations() {
      const [pickup, dropoff] = await Promise.all([
        debouncedPickup ? geocodeAddress(debouncedPickup) : Promise.resolve(null),
        debouncedDropoff ? geocodeAddress(debouncedDropoff) : Promise.resolve(null),
      ]);

      if (!isActive) return;

      setPickupCoords(pickup);
      setDropoffCoords(dropoff);

      if (pickup && dropoff) {
        const route = await fetchRoute(pickup, dropoff);
        if (isActive) setRoutePath(route);
      } else {
        setRoutePath(null);
      }
    }

    updateLocations();
    return () => {
      isActive = false;
    };
  }, [debouncedPickup, debouncedDropoff]);

  // Extract values for JSX to comply with standards (no inline expressions)
  const mapCenter = pickupCoords
    ? buildPosition(pickupCoords)
    : dropoffCoords
    ? buildPosition(dropoffCoords)
    : DEFAULT_CENTER;

  const mapZoom = pickupCoords || dropoffCoords ? MAP_ZOOM_CLOSED : MAP_ZOOM_DEFAULT;

  const pickupPosition = buildPosition(pickupCoords);
  const dropoffPosition = buildPosition(dropoffCoords);

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={mapCenter as [number, number]}
        zoom={mapZoom}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {pickupCoords && pickupPosition && (
          <Marker position={pickupPosition} icon={DEFAULT_MARKER_ICON} />
        )}
        {dropoffCoords && dropoffPosition && (
          <Marker position={dropoffPosition} icon={DEFAULT_MARKER_ICON} />
        )}

        {routePath && (
          <Polyline positions={routePath} pathOptions={ROUTE_PATH_OPTIONS} />
        )}

        <MapBoundsUpdater
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          routePath={routePath}
        />
      </MapContainer>
    </div>
  );
}