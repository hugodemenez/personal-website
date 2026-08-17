import { timingSafeEqual } from "node:crypto";

export const CURRENT_LOCATION_KEY = "current_location";
export const LOCATION_CACHE_TAG = "location";

export interface LocationUpdate {
  version: 1;
  country: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface StoredPlace {
  country: string;
  latitude: number;
  longitude: number;
  days: number;
  lastSeenAt: string;
}

export interface StoredLocation {
  version: 3;
  country: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  places: StoredPlace[];
}

export interface VisitedPlace {
  country: string;
  latitude: number;
  longitude: number;
  days: number | null;
  isCurrent: boolean;
  isHomeBase: boolean;
}

interface GlobalConfigWriteEnvironment {
  GLOBAL_CONFIG_ID?: string;
  GLOBAL_CONFIG_WRITE_TOKEN?: string;
  GLOBAL_CONFIG_TEAM_ID?: string;
}

export const MAX_STORED_PLACES = 3;
const MAX_DAYS = 20_000;

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
  // Apple Shortcuts may serialize location details as JSON strings. Accept the
  // plain decimal forms it produces while still rejecting ambiguous values.
  const coordinate =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^-?\d+(?:[.,]\d+)?$/.test(value.trim())
        ? Number(value.trim().replace(",", "."))
        : Number.NaN;

  if (!Number.isFinite(coordinate)) return undefined;
  if (coordinate < minimum || coordinate > maximum) return undefined;
  return Math.round((coordinate + Number.EPSILON) * 100) / 100;
}

function placeIdentity(country: string): string {
  return country.toLowerCase();
}

export function samePlace(
  left: { country: string },
  right: { country: string }
): boolean {
  return placeIdentity(left.country) === placeIdentity(right.country);
}

export function sameUtcCalendarDay(left: string, right: string): boolean {
  const leftDay = left.slice(0, 10);
  const rightDay = right.slice(0, 10);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(leftDay) &&
    /^\d{4}-\d{2}-\d{2}$/.test(rightDay) &&
    leftDay === rightDay
  );
}

function placeFromCurrent(current: LocationUpdate, days: number): StoredPlace {
  return {
    country: current.country,
    latitude: current.latitude,
    longitude: current.longitude,
    days,
    lastSeenAt: current.updatedAt,
  };
}

function trimStoredPlaces(
  places: StoredPlace[],
  current: { country: string }
): StoredPlace[] {
  if (places.length === 0) return [];

  const ranked = [...places].sort((left, right) => {
    const leftCurrent = samePlace(left, current) ? 1 : 0;
    const rightCurrent = samePlace(right, current) ? 1 : 0;
    if (leftCurrent !== rightCurrent) return rightCurrent - leftCurrent;
    if (left.days !== right.days) return right.days - left.days;
    return Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt);
  });

  return ranked.slice(0, MAX_STORED_PLACES);
}

function parseStoredPlace(value: unknown): StoredPlace | null {
  if (!isRecord(value)) return null;

  const country = normalizedText(value.country, 80);
  const latitude = roundedCoordinate(value.latitude, -90, 90);
  const longitude = roundedCoordinate(value.longitude, -180, 180);
  const days =
    typeof value.days === "number" && Number.isFinite(value.days)
      ? Math.round(value.days)
      : Number.NaN;
  const lastSeenAt = new Date(String(value.lastSeenAt));

  if (
    !country ||
    latitude === undefined ||
    longitude === undefined ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > MAX_DAYS ||
    Number.isNaN(lastSeenAt.getTime())
  ) {
    return null;
  }

  return {
    country,
    latitude,
    longitude,
    days,
    lastSeenAt: lastSeenAt.toISOString(),
  };
}

function parseStoredPlaces(
  value: unknown,
  current: LocationUpdate
): StoredPlace[] {
  if (!Array.isArray(value)) return [placeFromCurrent(current, 1)];

  const places: StoredPlace[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    const place = parseStoredPlace(entry);
    if (!place) continue;

    const identity = placeIdentity(place.country);
    if (seen.has(identity)) continue;
    seen.add(identity);
    places.push(place);
  }

  if (!places.some((place) => samePlace(place, current))) {
    places.unshift(placeFromCurrent(current, 1));
  }

  return trimStoredPlaces(places, current);
}

export function parseLocationUpdate(
  value: unknown,
  now = new Date()
): LocationUpdate | null {
  if (!isRecord(value)) return null;

  const country = normalizedText(value.country, 80);
  const latitude = roundedCoordinate(value.latitude, -90, 90);
  const longitude = roundedCoordinate(value.longitude, -180, 180);

  if (
    !country ||
    latitude === undefined ||
    longitude === undefined ||
    Number.isNaN(now.getTime())
  ) {
    return null;
  }

  return {
    version: 1,
    country,
    latitude,
    longitude,
    updatedAt: now.toISOString(),
  };
}

export function parseStoredLocation(value: unknown): StoredLocation | null {
  if (
    !isRecord(value) ||
    (value.version !== 1 && value.version !== 2 && value.version !== 3)
  ) {
    return null;
  }

  const current = parseLocationUpdate(value, new Date(String(value.updatedAt)));
  if (!current) return null;

  return {
    version: 3,
    country: current.country,
    latitude: current.latitude,
    longitude: current.longitude,
    updatedAt: current.updatedAt,
    places:
      value.version === 1
        ? [placeFromCurrent(current, 1)]
        : parseStoredPlaces(value.places, current),
  };
}

export function parseStoredLocationResponse(
  value: unknown
): StoredLocation | null {
  if (
    isRecord(value) &&
    isRecord(value.value) &&
    (value.value.version === 1 ||
      value.value.version === 2 ||
      value.value.version === 3)
  ) {
    return parseStoredLocation(value.value);
  }

  return parseStoredLocation(value);
}

export function applyLocationVisit(
  existing: StoredLocation | null,
  update: LocationUpdate
): StoredLocation {
  const places = existing ? existing.places.map((place) => ({ ...place })) : [];
  const index = places.findIndex((place) => samePlace(place, update));

  if (index === -1) {
    places.unshift(placeFromCurrent(update, 1));
  } else {
    const previous = places[index];
    const increment = !sameUtcCalendarDay(previous.lastSeenAt, update.updatedAt);
    places[index] = {
      country: update.country,
      latitude: update.latitude,
      longitude: update.longitude,
      days: Math.min(MAX_DAYS, previous.days + (increment ? 1 : 0)),
      lastSeenAt: update.updatedAt,
    };
  }

  places.sort((left, right) => {
    const leftCurrent = samePlace(left, update) ? 1 : 0;
    const rightCurrent = samePlace(right, update) ? 1 : 0;
    if (leftCurrent !== rightCurrent) return rightCurrent - leftCurrent;
    return Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt);
  });

  return {
    version: 3,
    country: update.country,
    latitude: update.latitude,
    longitude: update.longitude,
    updatedAt: update.updatedAt,
    places: trimStoredPlaces(places, update),
  };
}

function regionalCoordinate(
  latitude: number,
  longitude: number,
  country: string
): { latitude: number; longitude: number } {
  const hash = [...country].reduce((total, character) => total + character.charCodeAt(0), 0);
  return {
    latitude: Math.round(latitude) + ((hash % 5) - 2) * 0.18,
    longitude: Math.round(longitude) + (((hash >> 3) % 5) - 2) * 0.18,
  };
}

const PORTUGAL_HOME_COORDINATE = { latitude: 38.72, longitude: -9.14 };

export function toVisitedPlaces(saved: StoredLocation | null): VisitedPlace[] {
  if (!saved) {
    const home = regionalCoordinate(
      PORTUGAL_HOME_COORDINATE.latitude,
      PORTUGAL_HOME_COORDINATE.longitude,
      "Portugal"
    );
    return [
      {
        country: "Portugal",
        latitude: home.latitude,
        longitude: home.longitude,
        days: null,
        isCurrent: true,
        isHomeBase: true,
      },
    ];
  }

  return saved.places
    .map((place) => {
      const region = regionalCoordinate(
        place.latitude,
        place.longitude,
        place.country
      );
      return {
        country: place.country,
        latitude: region.latitude,
        longitude: region.longitude,
        days: place.days,
        isCurrent: samePlace(place, saved),
        isHomeBase: false,
      };
    })
    .sort((left, right) => {
      if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1;
      return (right.days ?? 0) - (left.days ?? 0);
    });
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

function globalConfigUrl(
  environment: GlobalConfigWriteEnvironment,
  path: string
): URL | null {
  const id = environment.GLOBAL_CONFIG_ID;
  if (!id) return null;

  const url = new URL(
    `https://api.vercel.com/v1/edge-config/${encodeURIComponent(id)}${path}`
  );
  if (environment.GLOBAL_CONFIG_TEAM_ID) {
    url.searchParams.set("teamId", environment.GLOBAL_CONFIG_TEAM_ID);
  }
  return url;
}

export function createGlobalConfigReadRequest(
  environment: GlobalConfigWriteEnvironment
): { url: string; init: RequestInit } | null {
  const token = environment.GLOBAL_CONFIG_WRITE_TOKEN;
  const url = globalConfigUrl(
    environment,
    `/item/${encodeURIComponent(CURRENT_LOCATION_KEY)}`
  );
  if (!url || !token) return null;

  return {
    url: url.toString(),
    init: {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
    },
  };
}

export function createGlobalConfigItemWriteRequest(
  key: string,
  value: unknown,
  environment: GlobalConfigWriteEnvironment
): { url: string; init: RequestInit } | null {
  const token = environment.GLOBAL_CONFIG_WRITE_TOKEN;
  const url = globalConfigUrl(environment, "/items");
  if (!url || !token) return null;

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
            key,
            value,
          },
        ],
      }),
    },
  };
}

export function createGlobalConfigWriteRequest(
  location: StoredLocation,
  environment: GlobalConfigWriteEnvironment
): { url: string; init: RequestInit } | null {
  return createGlobalConfigItemWriteRequest(
    CURRENT_LOCATION_KEY,
    location,
    environment
  );
}
