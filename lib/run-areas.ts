import {
  CLUSTER_RADIUS_KM,
  distanceKm,
  type DistinctPath,
} from "./shape-runs";

export interface RunArea {
  name: string;
  center: [number, number];
}

export interface StoredRunAreas {
  version: 1;
  areas: Array<{
    name: string;
    latitude: number;
    longitude: number;
  }>;
}

const MAX_STORED_AREAS = 20;

export function matchRunArea(
  center: [number, number],
  areas: readonly RunArea[],
  radiusKm = CLUSTER_RADIUS_KM
): RunArea | null {
  let nearest: RunArea | null = null;
  let nearestDistance = Infinity;

  for (const area of areas) {
    const distance = distanceKm(center, area.center);
    if (distance <= radiusKm && distance < nearestDistance) {
      nearest = area;
      nearestDistance = distance;
    }
  }

  return nearest;
}

export function applyRunAreaNames(
  paths: DistinctPath[],
  areas: readonly RunArea[]
): DistinctPath[] {
  return paths.map((path) => {
    if (path.placeName) return path;
    const match = matchRunArea(path.center, areas);
    return match ? { ...path, placeName: match.name } : path;
  });
}

export function mergeRunArea(
  areas: readonly RunArea[],
  next: RunArea,
  radiusKm = CLUSTER_RADIUS_KM
): RunArea[] {
  if (matchRunArea(next.center, areas, radiusKm)) {
    return [...areas];
  }

  return [...areas, next].slice(-MAX_STORED_AREAS);
}

export function parseStoredRunAreas(value: unknown): RunArea[] {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.areas)) {
    return [];
  }

  const areas: RunArea[] = [];
  for (const item of value.areas) {
    if (!isRecord(item)) continue;
    if (typeof item.name !== "string") continue;
    const name = item.name.trim();
    if (!name || name.length > 80) continue;
    if (typeof item.latitude !== "number" || typeof item.longitude !== "number") {
      continue;
    }
    if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) {
      continue;
    }
    areas.push({ name, center: [item.latitude, item.longitude] });
  }

  return areas;
}

export function toStoredRunAreas(areas: readonly RunArea[]): StoredRunAreas {
  return {
    version: 1,
    areas: areas.map((area) => ({
      name: area.name,
      latitude: roundCoordinate(area.center[0]),
      longitude: roundCoordinate(area.center[1]),
    })),
  };
}

export function stayAreasFromPlaces(
  places: ReadonlyArray<{
    city: string;
    latitude: number;
    longitude: number;
  }>
): RunArea[] {
  return places.map((place) => ({
    name: place.city,
    center: [place.latitude, place.longitude],
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roundCoordinate(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}
