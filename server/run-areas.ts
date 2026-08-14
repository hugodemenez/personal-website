import { generateText, Output, gateway } from "ai";
import { z } from "zod";
import {
  applyRunAreaNames,
  stayAreasFromPlaces,
  type RunArea,
} from "@/lib/run-areas";
import type { DistinctPath } from "@/lib/shape-runs";
import { getStayRunAreas } from "@/server/location";

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
  const stays = await getStayRunAreas().catch(() => []);
  return stayAreasFromPlaces(stays);
}

export async function nameRunningPaths(
  paths: DistinctPath[],
  options: NameRunningPathsOptions = {}
): Promise<DistinctPath[]> {
  const known =
    options.knownAreas ?? (await loadKnownRunAreas().catch(() => []));
  const lookupName = options.lookupName ?? lookupRunAreaName;

  const named = applyRunAreaNames(paths, known);
  const discovered: RunArea[] = [];

  for (const path of named) {
    if (path.placeName) continue;
    const name = await lookupName(path.center);
    if (!name) continue;
    discovered.push({ name, center: path.center });
  }

  return discovered.length ? applyRunAreaNames(named, discovered) : named;
}
