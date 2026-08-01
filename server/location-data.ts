import { timingSafeEqual } from "node:crypto";

export const CURRENT_LOCATION_KEY = "current_location";
export interface StoredLocation {
  version: 1;
  city: string;
  country?: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

interface GlobalConfigWriteEnvironment {
  GLOBAL_CONFIG_ID?: string;
  GLOBAL_CONFIG_WRITE_TOKEN?: string;
  GLOBAL_CONFIG_TEAM_ID?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maxLength) return undefined;
  return normalized;
}

function roundedCoordinate(
  value: unknown,
  minimum: number,
  maximum: number
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < minimum || value > maximum) return undefined;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseLocationUpdate(
  value: unknown,
  now = new Date()
): StoredLocation | null {
  if (!isRecord(value)) return null;

  const city = normalizedText(value.city, 80);
  const country =
    value.country === undefined ? undefined : normalizedText(value.country, 80);
  const latitude = roundedCoordinate(value.latitude, -90, 90);
  const longitude = roundedCoordinate(value.longitude, -180, 180);

  if (
    !city ||
    (value.country !== undefined && !country) ||
    latitude === undefined ||
    longitude === undefined ||
    Number.isNaN(now.getTime())
  ) {
    return null;
  }

  return {
    version: 1,
    city,
    ...(country ? { country } : {}),
    latitude,
    longitude,
    updatedAt: now.toISOString(),
  };
}

export function parseStoredLocation(value: unknown): StoredLocation | null {
  if (!isRecord(value) || value.version !== 1) return null;

  const parsed = parseLocationUpdate(value, new Date(String(value.updatedAt)));
  return parsed;
}

export function hasValidBearerToken(
  authorization: string | null,
  expectedSecret: string | undefined
): boolean {
  if (!authorization?.startsWith("Bearer ") || !expectedSecret) return false;

  const supplied = Buffer.from(authorization.slice(7), "utf8");
  const expected = Buffer.from(expectedSecret, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createGlobalConfigWriteRequest(
  location: StoredLocation,
  environment: GlobalConfigWriteEnvironment
): { url: string; init: RequestInit } | null {
  const id = environment.GLOBAL_CONFIG_ID;
  const token = environment.GLOBAL_CONFIG_WRITE_TOKEN;
  if (!id || !token) return null;

  const url = new URL(
    `https://api.vercel.com/v1/edge-config/${encodeURIComponent(id)}/items`
  );
  if (environment.GLOBAL_CONFIG_TEAM_ID) {
    url.searchParams.set("teamId", environment.GLOBAL_CONFIG_TEAM_ID);
  }

  return {
    url: url.toString(),
    init: {
      method: "PATCH",
      cache: "no-store",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            operation: "upsert",
            key: CURRENT_LOCATION_KEY,
            value: location,
          },
        ],
      }),
    },
  };
}
