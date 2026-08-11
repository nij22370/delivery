// Shared client-side geocoding helper — routes through the server proxy
// (/api/geocode) so the browser never calls Nominatim directly (CORS,
// forbidden User-Agent header, and rate limits are handled server-side).
const GEOCODE_ENDPOINT = "/api/geocode";

export interface Coordinates {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  if (!address.trim()) return null;
  try {
    const params = new URLSearchParams({ q: address });
    const response = await fetch(`${GEOCODE_ENDPOINT}?${params}`);
    if (!response.ok) return null;

    const data: unknown = await response.json();
    if (data && typeof data === "object") {
      const { lat, lng } = data as { lat?: number; lng?: number };
      if (typeof lat === "number" && typeof lng === "number") {
        return { lat, lng };
      }
    }
  } catch (error: unknown) {
    console.error("Geocoding error:", error);
  }
  return null;
}
