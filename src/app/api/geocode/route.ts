// Geocode proxy route — Nominatim is called server-side so the browser never
// hits CORS, forbidden-header (User-Agent), or rate-limit failures.
import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT = "SwiftShip-Driver-Delivery-Platform/1.0";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ message: "Missing q parameter" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({ q: query, format: "json", limit: "1" });
    const response = await fetch(`${NOMINATIM_ENDPOINT}?${params}`, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      console.error(`Geocode proxy: Nominatim returned ${response.status}`);
      return NextResponse.json(
        { message: "Geocoding service unavailable" },
        { status: 502 }
      );
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ message: "Address not found" }, { status: 404 });
    }

    const firstResult = data[0] as { lat?: string; lon?: string };
    if (!firstResult.lat || !firstResult.lon) {
      return NextResponse.json({ message: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({
      lat: parseFloat(firstResult.lat),
      lng: parseFloat(firstResult.lon),
    });
  } catch (error: unknown) {
    console.error("Geocode proxy error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
