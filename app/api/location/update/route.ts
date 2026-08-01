import { NextResponse } from "next/server";
import {
  createGlobalConfigWriteRequest,
  hasValidBearerToken,
  parseLocationUpdate,
  type StoredLocation,
} from "@/server/location-data";

interface GeocodingResponse {
  results?: Array<{
    latitude?: number;
    longitude?: number;
    country?: string;
  }>;
}

function json(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function squaredCoordinateDistance(
  location: StoredLocation,
  candidate: { latitude: number; longitude: number }
) {
  const latitudeDelta = candidate.latitude - location.latitude;
  const longitudeDelta =
    (candidate.longitude - location.longitude) *
    Math.cos((location.latitude * Math.PI) / 180);
  return latitudeDelta ** 2 + longitudeDelta ** 2;
}

async function resolveCoarseCoordinates(
  location: StoredLocation
): Promise<StoredLocation | null> {
  if (
    !Number.isInteger(location.latitude) &&
    !Number.isInteger(location.longitude)
  ) {
    return location;
  }

  const params = new URLSearchParams({
    name: location.city,
    count: "100",
    language: "pt",
    format: "json",
  });

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
      { headers: { accept: "application/json" } }
    );
    if (!response.ok) return null;

    const data = (await response.json()) as GeocodingResponse;
    const candidates = (data.results ?? []).filter(
      (
        candidate
      ): candidate is { latitude: number; longitude: number; country?: string } =>
        typeof candidate.latitude === "number" &&
        Number.isFinite(candidate.latitude) &&
        typeof candidate.longitude === "number" &&
        Number.isFinite(candidate.longitude) &&
        (!location.country ||
          candidate.country?.localeCompare(location.country, undefined, {
            sensitivity: "base",
          }) === 0)
    );
    const nearest = candidates.sort(
      (a, b) =>
        squaredCoordinateDistance(location, a) -
        squaredCoordinateDistance(location, b)
    )[0];

    // Keep the fallback within roughly 220 km. A farther result is more likely
    // an identically named place than the locality reported by the phone.
    if (!nearest || squaredCoordinateDistance(location, nearest) > 4) return null;

    return {
      ...location,
      latitude: Math.round(nearest.latitude * 100) / 100,
      longitude: Math.round(nearest.longitude * 100) / 100,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (
    !hasValidBearerToken(
      request.headers.get("authorization"),
      process.env.LOCATION_UPDATE_SECRET
    )
  ) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_096) {
    return json({ ok: false, error: "Invalid location payload" }, 400);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid location payload" }, 400);
  }

  const parsedLocation = parseLocationUpdate(payload);
  if (!parsedLocation) {
    return json({ ok: false, error: "Invalid location payload" }, 400);
  }
  const location = await resolveCoarseCoordinates(parsedLocation);
  if (!location) {
    return json({ ok: false, error: "Unable to resolve precise location" }, 503);
  }

  const writeRequest = createGlobalConfigWriteRequest(location, {
    GLOBAL_CONFIG_ID: process.env.GLOBAL_CONFIG_ID,
    GLOBAL_CONFIG_WRITE_TOKEN: process.env.GLOBAL_CONFIG_WRITE_TOKEN,
    GLOBAL_CONFIG_TEAM_ID: process.env.GLOBAL_CONFIG_TEAM_ID,
  });
  if (!writeRequest) {
    return json({ ok: false, error: "Location storage unavailable" }, 503);
  }

  try {
    const response = await fetch(writeRequest.url, writeRequest.init);
    if (!response.ok) throw new Error("Global Config write failed");
  } catch {
    console.error("Unable to update the current location in Global Config");
    return json({ ok: false, error: "Location storage unavailable" }, 503);
  }

  return json(
    {
      ok: true,
      location: { city: location.city, updatedAt: location.updatedAt },
    },
    200
  );
}
