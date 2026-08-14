import {
  CLUSTER_RADIUS_KM,
  distanceKm,
  type DistinctPath,
} from "./shape-runs";

export interface RunArea {
  name: string;
  center: [number, number];
}

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
