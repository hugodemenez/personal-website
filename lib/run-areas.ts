import { distanceKm, type DistinctPath } from "./shape-runs";

export interface RunArea {
  name: string;
  center: [number, number];
}

// Route clustering stays tight so two nearby loops become one card.
// Naming is looser: a stay still labels nearby loops (~15 km) with its
// country, without attaching a distant cluster in the same country.
export const STAY_MATCH_RADIUS_KM = 15;

export function matchRunArea(
  center: [number, number],
  areas: readonly RunArea[],
  radiusKm = STAY_MATCH_RADIUS_KM
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
    country: string;
    latitude: number;
    longitude: number;
  }>
): RunArea[] {
  return places.map((place) => ({
    name: place.country,
    center: [place.latitude, place.longitude],
  }));
}
