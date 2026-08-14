import { createClient } from "@vercel/global-config";
import { generateText, Output, gateway } from "ai";
import { z } from "zod";
import {
  applyRunAreaNames,
  mergeRunArea,
  parseStoredRunAreas,
  stayAreasFromPlaces,
  toStoredRunAreas,
  type RunArea,
} from "@/lib/run-areas";
import type { DistinctPath } from "@/lib/shape-runs";
import { createGlobalConfigItemWriteRequest } from "@/server/location-data";
import { getStayRunAreas } from "@/server/location";

export const RUN_AREAS_KEY = "run_areas";
export const RUN_AREA_MODEL = "google/gemini-3-flash";

const runAreaOutput = z.object({
  name: z
    .string()
    .nullable()
    .describe(
      "Town, parish, or neighborhood a local runner would use. Null if uncertain."
    ),
});

export interface NameRunningPathsOptions {
  knownAreas?: RunArea[];
  lookupName?: (center: [number, number]) => Promise<string | null>;
  persistAreas?: (areas: RunArea[]) => Promise<void>;
}

export async function lookupRunAreaName(
  center: [number, number]
): Promise<string | null> {
  try {
    const { output } = await generateText({
      model: gateway(RUN_AREA_MODEL),
      output: Output.object({
        name: "RunArea",
        description:
          "Locality name for a usual running area, or null if unknown.",
        schema: runAreaOutput,
      }),
      prompt: [
        "Name the locality where someone usually runs, given a GPS centroid.",
        "Prefer the town, parish, or neighborhood a local would use.",
        "Do not return a country, region, or the nearest large city when a smaller place is clear.",
        "If you are not confident in a specific place name, return name: null.",
        `Centroid: ${center[0].toFixed(3)}, ${center[1].toFixed(3)}`,
      ].join("\n"),
      providerOptions: {
        gateway: {
          tags: ["feature:run-areas"],
          caching: "auto",
        },
      },
    });

    const name = output?.name?.trim();
    return name ? name : null;
  } catch (error) {
    console.error("Unable to resolve a running area name", error);
    return null;
  }
}

export async function loadKnownRunAreas(): Promise<RunArea[]> {
  const [stored, stays] = await Promise.all([
    readStoredRunAreas(),
    getStayRunAreas().catch(() => []),
  ]);

  return [...stored, ...stayAreasFromPlaces(stays)];
}

export async function persistRunAreas(areas: RunArea[]): Promise<void> {
  const request = createGlobalConfigItemWriteRequest(
    RUN_AREAS_KEY,
    toStoredRunAreas(areas),
    {
      GLOBAL_CONFIG_ID: process.env.GLOBAL_CONFIG_ID,
      GLOBAL_CONFIG_WRITE_TOKEN: process.env.GLOBAL_CONFIG_WRITE_TOKEN,
      GLOBAL_CONFIG_TEAM_ID: process.env.GLOBAL_CONFIG_TEAM_ID,
    }
  );
  if (!request) {
    console.error(
      "Unable to store resolved running areas: Global Config write is not configured"
    );
    return;
  }

  try {
    const response = await fetch(request.url, request.init);
    if (!response.ok) {
      throw new Error(`Global Config write failed (${response.status})`);
    }
  } catch (error) {
    console.error("Unable to store resolved running areas", error);
  }
}

export async function nameRunningPaths(
  paths: DistinctPath[],
  options: NameRunningPathsOptions = {}
): Promise<DistinctPath[]> {
  const known =
    options.knownAreas ?? (await loadKnownRunAreas().catch(() => []));
  const lookupName = options.lookupName ?? lookupRunAreaName;
  const persistAreas = options.persistAreas ?? persistRunAreas;

  // Store first: a cluster already in `run_areas` or Places is named
  // here and never sent to the model again.
  let named = applyRunAreaNames(paths, known);
  const discovered: RunArea[] = [];

  for (const path of named) {
    if (path.placeName) continue;
    const name = await lookupName(path.center);
    if (!name) continue;
    discovered.push({ name, center: path.center });
  }

  if (!discovered.length) return named;

  named = applyRunAreaNames(named, discovered);
  let stored = known;
  for (const area of discovered) {
    stored = mergeRunArea(stored, area);
  }
  await persistAreas(stored);
  return named;
}

async function readStoredRunAreas(): Promise<RunArea[]> {
  if (!process.env.GLOBAL_CONFIG) return [];

  try {
    const globalConfig = createClient(process.env.GLOBAL_CONFIG, {
      cache: "no-store",
      disableDevelopmentCache: true,
    });
    return parseStoredRunAreas(await globalConfig.get(RUN_AREAS_KEY));
  } catch {
    console.error("Unable to read stored running areas from Global Config");
    return [];
  }
}
