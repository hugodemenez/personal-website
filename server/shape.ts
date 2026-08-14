"use server";

import { cacheLife } from "next/cache";
import {
  RECENT_RUN_LIMIT,
  selectRecentRuns,
  toRecentRun,
  type RecentRun,
  type ShapeActivity,
} from "@/lib/shape-runs";

const SHAPE_API_BASE = "https://shapecalendar.com/api/v1";
const LOOKBACK_DAYS = 90;

interface ShapeActivitiesResponse {
  activities?: ShapeActivity[];
  error?: string;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getRecentRuns(
  limit = RECENT_RUN_LIMIT
): Promise<RecentRun[]> {
  "use cache";
  cacheLife("minutes");

  const token = process.env.SHAPE_API_KEY;
  if (!token) return [];

  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - LOOKBACK_DAYS);

  const params = new URLSearchParams({
    from: isoDate(from),
    to: isoDate(to),
    sportType: "run",
    completed: "true",
    limit: "50",
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

    return selectRecentRuns(data.activities ?? [], limit).map(toRecentRun);
  } catch (error) {
    console.error("Unable to load recent runs from Shape", error);
    return [];
  }
}
