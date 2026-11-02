import { cache } from "react";
import { FALLBACK_SHAPE_ACTIVITIES } from "@/lib/shape-runs-fallback";
import {
  applyRunAreaNames,
  stayAreasFromPlaces,
} from "@/lib/run-areas";
import {
  encodedMapFromGps,
  enrichActivitiesWithMaps,
  selectDistinctPaths,
  type DistinctPath,
  type ShapeActivity,
} from "@/lib/shape-runs";
import { getStayRunAreas } from "@/server/location";

const SHAPE_API_BASE = "https://shapecalendar.com/api/v1";
const LOOKBACK_DAYS = 180;
const MAP_DETAIL_POINTS = 500;

interface ShapeActivityDetailsResponse {
  channels?: {
    lat?: unknown;
    lng?: unknown;
  };
}

interface ShapeActivitiesResponse {
  activities?: ShapeActivity[];
  error?: string;
}

export interface RunningSectionData {
  paths: DistinctPath[];
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function resolveRunningPaths(
  activities: ShapeActivity[]
): DistinctPath[] {
  const paths = selectDistinctPaths(activities);
  return paths.length > 0
    ? paths
    : selectDistinctPaths(FALLBACK_SHAPE_ACTIVITIES);
}

export async function fetchActivityGpsMap(
  id: string,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<string | null> {
  const params = new URLSearchParams({
    channels: "lat,lng",
    points: String(MAP_DETAIL_POINTS),
    includeLaps: "false",
    includeZones: "false",
    includeLengths: "false",
  });

  try {
    const response = await fetcher(
      `${SHAPE_API_BASE}/activities/${encodeURIComponent(id)}/details?${params}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) return null;

    const data = (await response.json()) as ShapeActivityDetailsResponse;
    return encodedMapFromGps(data.channels?.lat, data.channels?.lng);
  } catch {
    return null;
  }
}

async function nameResolvedPaths(
  paths: DistinctPath[]
): Promise<DistinctPath[]> {
  const stays = await getStayRunAreas().catch(() => []);
  return applyRunAreaNames(paths, stayAreasFromPlaces(stays));
}

export const loadRunningSection = cache(
  async (): Promise<RunningSectionData> => {
    const token = process.env.SHAPE_API_KEY;
    if (!token) {
      return { paths: await nameResolvedPaths(resolveRunningPaths([])) };
    }

    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - LOOKBACK_DAYS);

    const params = new URLSearchParams({
      from: isoDate(from),
      to: isoDate(to),
      sportType: "run",
      completed: "true",
      limit: "200",
    });

    try {
      const response = await fetch(`${SHAPE_API_BASE}/activities?${params}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await response.json()) as ShapeActivitiesResponse;

      if (!response.ok) {
        throw new Error(data.error ?? `Shape API failed (${response.status})`);
      }

      const activities = await enrichActivitiesWithMaps(
        data.activities ?? [],
        (id) => fetchActivityGpsMap(id, token)
      );

      return {
        paths: await nameResolvedPaths(resolveRunningPaths(activities)),
      };
    } catch (error) {
      console.error("Unable to load recent runs from Shape", error);
      return { paths: await nameResolvedPaths(resolveRunningPaths([])) };
    }
  }
);
