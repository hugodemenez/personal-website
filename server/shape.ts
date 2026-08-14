import { cache } from "react";
import { FALLBACK_SHAPE_ACTIVITIES } from "@/lib/shape-runs-fallback";
import {
  selectDistinctPaths,
  type DistinctPath,
  type ShapeActivity,
} from "@/lib/shape-runs";

const SHAPE_API_BASE = "https://shapecalendar.com/api/v1";
const LOOKBACK_DAYS = 180;

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

export const loadRunningSection = cache(
  async (): Promise<RunningSectionData> => {
    const token = process.env.SHAPE_API_KEY;
    if (!token) return { paths: resolveRunningPaths([]) };

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

      return { paths: resolveRunningPaths(data.activities ?? []) };
    } catch (error) {
      console.error("Unable to load recent runs from Shape", error);
      return { paths: resolveRunningPaths([]) };
    }
  }
);
