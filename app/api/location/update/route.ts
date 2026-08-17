import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  applyLocationVisit,
  createGlobalConfigReadRequest,
  createGlobalConfigWriteRequest,
  hasValidBearerToken,
  LOCATION_CACHE_TAG,
  parseLocationUpdate,
  parseStoredLocationResponse,
} from "@/server/location-data";

function json(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasDecimalPrecision(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value) && !Number.isInteger(value);
  }

  if (typeof value !== "string") return false;
  const normalized = value.trim().replace(",", ".");
  return /^-?\d+\.\d+$/.test(normalized) && !Number.isInteger(Number(normalized));
}

function loggedPayload(payload: unknown) {
  if (!isRecord(payload)) return { payloadType: typeof payload };

  return {
    country: payload.country,
    latitude: payload.latitude,
    longitude: payload.longitude,
  };
}

export async function POST(request: Request) {
  if (
    !hasValidBearerToken(
      request.headers.get("authorization"),
      process.env.LOCATION_UPDATE_SECRET
    )
  ) {
    console.warn("Location update rejected", { reason: "unauthorized" });
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_096) {
    console.warn("Location update rejected", {
      reason: "payload-too-large",
      contentLength,
    });
    return json({ ok: false, error: "Invalid location payload" }, 400);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    console.warn("Location update rejected", { reason: "invalid-json" });
    return json({ ok: false, error: "Invalid location payload" }, 400);
  }

  console.info("Location update received", loggedPayload(payload));

  const location = parseLocationUpdate(payload);
  if (!location) {
    console.warn("Location update rejected", {
      reason: "invalid-payload",
      ...loggedPayload(payload),
    });
    return json({ ok: false, error: "Invalid location payload" }, 400);
  }

  if (
    !isRecord(payload) ||
    !hasDecimalPrecision(payload.latitude) ||
    !hasDecimalPrecision(payload.longitude)
  ) {
    console.warn("Location update rejected", {
      reason: "coordinates-without-decimal-precision",
      ...loggedPayload(payload),
    });
    return json(
      { ok: false, error: "Coordinates must include decimal precision" },
      400
    );
  }

  const environment = {
    GLOBAL_CONFIG_ID: process.env.GLOBAL_CONFIG_ID,
    GLOBAL_CONFIG_WRITE_TOKEN: process.env.GLOBAL_CONFIG_WRITE_TOKEN,
    GLOBAL_CONFIG_TEAM_ID: process.env.GLOBAL_CONFIG_TEAM_ID,
  };
  const readRequest = createGlobalConfigReadRequest(environment);
  if (!readRequest) {
    console.error("Location update failed", {
      reason: "storage-unavailable",
      ...loggedPayload(payload),
    });
    return json({ ok: false, error: "Location storage unavailable" }, 503);
  }

  let existing = null;
  try {
    const response = await fetch(readRequest.url, readRequest.init);
    if (response.status === 404) {
      existing = null;
    } else if (!response.ok) {
      throw new Error("Global Config read failed");
    } else {
      const body: unknown = await response.json();
      existing = parseStoredLocationResponse(body);
      if (body != null && existing === null) {
        throw new Error("Global Config returned an unreadable location");
      }
    }
  } catch {
    console.error("Location update failed", {
      reason: "storage-read-failed",
      ...loggedPayload(payload),
    });
    return json({ ok: false, error: "Location storage unavailable" }, 503);
  }

  const stored = applyLocationVisit(existing, location);
  const writeRequest = createGlobalConfigWriteRequest(stored, environment);
  if (!writeRequest) {
    console.error("Location update failed", {
      reason: "storage-unavailable",
      ...loggedPayload(payload),
    });
    return json({ ok: false, error: "Location storage unavailable" }, 503);
  }

  try {
    const response = await fetch(writeRequest.url, writeRequest.init);
    if (!response.ok) throw new Error("Global Config write failed");
  } catch {
    console.error("Location update failed", {
      reason: "storage-write-failed",
      ...loggedPayload(payload),
    });
    return json({ ok: false, error: "Location storage unavailable" }, 503);
  }

  const currentPlace = stored.places.find((place) =>
    place.country === stored.country
  );
  try {
    revalidateTag(LOCATION_CACHE_TAG, "max");
  } catch {
    // Route unit tests call POST without a Next.js request store.
  }

  console.info("Location update stored", {
    country: stored.country,
    latitude: stored.latitude,
    longitude: stored.longitude,
    updatedAt: stored.updatedAt,
    days: currentPlace?.days,
    places: stored.places.length,
  });

  return json(
    {
      ok: true,
      location: { country: stored.country, updatedAt: stored.updatedAt },
    },
    200
  );
}
