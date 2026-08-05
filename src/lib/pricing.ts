// ── Pricing Constants ────────────────────────────────────────────────────────
const BASE_FARE_CENTS = 500; // $5.00 base
const PER_KM_RATE_CENTS = 50; // $0.50 per km
const EARTH_RADIUS_METERS = 6371e3;
const METERS_PER_KM = 1000;
const METERS_PER_MILE = 1609.344;
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT = "SwiftShip-Driver-Delivery-Platform/1.0";

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
    const params = new URLSearchParams({ q: address, format: "json", limit: "1" });
    const response = await fetch(`${NOMINATIM_ENDPOINT}?${params}`, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });
    const data: Array<{ lat: string; lon: string }> = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // Geocoding is best-effort; caller handles null
  }
  return null;
}

export async function calculateSuggestedPrice(
  pickupAddress: string,
  dropoffAddress: string
): Promise<PriceSuggestion | null> {
  const [pickup, dropoff] = await Promise.all([
    geocodeAddress(pickupAddress),
    geocodeAddress(dropoffAddress),
  ]);

  if (!pickup || !dropoff) return null;

  const distanceMeters = haversineDistanceMeters(pickup, dropoff);
  const distanceKm = distanceMeters / METERS_PER_KM;
  const distanceMiles = distanceMeters / METERS_PER_MILE;
  const suggestedPriceCents = Math.round(BASE_FARE_CENTS + PER_KM_RATE_CENTS * distanceKm);

  return {
    suggestedPriceCents,
    distanceKm: Math.round(distanceKm * 10) / 10,
    distanceMiles: Math.round(distanceMiles * 10) / 10,
  };
}
