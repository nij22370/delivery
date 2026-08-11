// ── Imports ────────────────────────────────────────────────────────────────────
import { JOB_VEHICLE_TYPE, type JobVehicleType } from "@/types/job";

// ── Pricing Constants ────────────────────────────────────────────────────────
// Rate structure mirrors the factors Nepali delivery platforms use (Pathao
// Parcel et al.): a flat base fare per vehicle tier, plus a per-km rate for
// distance beyond the free allowance. Each vehicle's rate tier encodes its
// weight-capacity bracket (maxKg), so heavier vehicles carry a higher base
// fare. Placeholder rates in USD cents — tune per market.
const EARTH_RADIUS_METERS = 6371e3;
const METERS_PER_KM = 1000;
const METERS_PER_MILE = 1609.344;

export interface VehicleRateConfig {
  baseCents: number; // flat pickup/handling fee
  freeKm: number; // distance (km) included in the base fare
  perKmCents: number; // charge per additional km
  maxKg: number; // vehicle weight-capacity bracket (kg)
}

export const VEHICLE_RATES: Record<JobVehicleType, VehicleRateConfig> = {
  [JOB_VEHICLE_TYPE.BICYCLE]: { baseCents: 500, freeKm: 2, perKmCents: 45, maxKg: 5 },
  [JOB_VEHICLE_TYPE.CAR]: { baseCents: 700, freeKm: 2, perKmCents: 60, maxKg: 50 },
  [JOB_VEHICLE_TYPE.VAN]: { baseCents: 1200, freeKm: 2, perKmCents: 90, maxKg: 500 },
  [JOB_VEHICLE_TYPE.TRUCK]: { baseCents: 2000, freeKm: 2, perKmCents: 120, maxKg: 2000 },
};

interface Coordinates {
  lat: number;
  lng: number;
}

interface PriceSuggestion {
  suggestedPriceCents: number;
  distanceKm: number;
  distanceMiles: number;
}

function haversineDistanceMeters(from: Coordinates, to: Coordinates): number {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  if (!address.trim()) return null;

  try {
    // Geocode through the server proxy so the browser never calls Nominatim
    // directly (CORS / forbidden User-Agent header / rate limits).
    const params = new URLSearchParams({ q: address });
    const response = await fetch(`/api/geocode?${params}`);
    if (!response.ok) return null;

    const data: unknown = await response.json();
    if (data && typeof data === "object") {
      const { lat, lng } = data as { lat?: number; lng?: number };
      if (typeof lat === "number" && typeof lng === "number") {
        return { lat, lng };
      }
    }
  } catch {
    // Geocoding is best-effort; caller handles null
  }
  return null;
}

export async function calculateSuggestedPrice(
  pickupAddress: string,
  dropoffAddress: string,
  vehicleType: JobVehicleType
): Promise<PriceSuggestion | null> {
  const config = VEHICLE_RATES[vehicleType];
  if (!config) return null;

  const [pickup, dropoff] = await Promise.all([
    geocodeAddress(pickupAddress),
    geocodeAddress(dropoffAddress),
  ]);

  if (!pickup || !dropoff) return null;

  const distanceMeters = haversineDistanceMeters(pickup, dropoff);
  const distanceKm = distanceMeters / METERS_PER_KM;
  const distanceMiles = distanceMeters / METERS_PER_MILE;

  const billableKm = Math.max(0, distanceKm - config.freeKm);
  const suggestedPriceCents = Math.round(config.baseCents + billableKm * config.perKmCents);

  return {
    suggestedPriceCents,
    distanceKm: Math.round(distanceKm * 10) / 10,
    distanceMiles: Math.round(distanceMiles * 10) / 10,
  };
}
