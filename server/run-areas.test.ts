import assert from "node:assert/strict";
import test from "node:test";
import { nameRunningPaths } from "./run-areas";
import type { DistinctPath } from "@/lib/shape-runs";

function path(overrides: Partial<DistinctPath> = {}): DistinctPath {
  return {
    run: {
      id: "run-1",
      title: "Tempo 2km",
      date: "2026-08-14",
      dateLabel: "Aug 14",
      distanceLabel: "4.6 km",
      durationLabel: "25:28",
      paceLabel: "5:29/km",
      mapPath: null,
      href: null,
    },
    count: 14,
    spanDays: 36,
    sketch: null,
    center: [38.553, -9.018],
    placeName: null,
    averageDistanceLabel: "6.3 km",
    averageDurationLabel: "38:56",
    averagePaceLabel: "6:10/km",
    totalDistanceLabel: "88.4 km",
    ...overrides,
  };
}

test("uses a stay or stored area before asking the model", async () => {
  const lookups: Array<[number, number]> = [];
  const named = await nameRunningPaths(
    [
      path(),
      path({
        run: { ...path().run, id: "run-2" },
        center: [50.665, 3.166],
      }),
    ],
    {
      knownAreas: [{ name: "Azeitão", center: [38.52, -9.02] }],
      lookupName: async (center) => {
        lookups.push(center);
        return "Lille";
      },
      persistAreas: async () => {},
    }
  );

  assert.equal(named[0].placeName, "Azeitão");
  assert.equal(named[1].placeName, "Lille");
  assert.deepEqual(lookups, [[50.665, 3.166]]);
});

test("does not ask the model again for a zone already in the store", async () => {
  let lookups = 0;
  let stored: Array<{ name: string; center: [number, number] }> = [];

  const first = await nameRunningPaths([path({ center: [50.665, 3.166] })], {
    knownAreas: stored,
    lookupName: async () => {
      lookups += 1;
      return "Lille";
    },
    persistAreas: async (areas) => {
      stored = areas;
    },
  });
  const second = await nameRunningPaths([path({ center: [50.67, 3.17] })], {
    knownAreas: stored,
    lookupName: async () => {
      lookups += 1;
      return "Lille";
    },
    persistAreas: async (areas) => {
      stored = areas;
    },
  });

  assert.equal(first[0].placeName, "Lille");
  assert.equal(second[0].placeName, "Lille");
  assert.equal(lookups, 1);
  assert.equal(stored[0]?.name, "Lille");
});

test("stores a newly resolved zone and skips unnamed clusters", async () => {
  const persisted: string[] = [];
  const named = await nameRunningPaths(
    [
      path({ center: [48.8566, 2.3522] }),
      path({
        run: { ...path().run, id: "run-2" },
        center: [45.764, 4.8357],
      }),
    ],
    {
      knownAreas: [],
      lookupName: async (center) =>
        center[0] > 48 ? "Paris" : null,
      persistAreas: async (areas) => {
        persisted.push(...areas.map((area) => area.name));
      },
    }
  );

  assert.equal(named[0].placeName, "Paris");
  assert.equal(named[1].placeName, null);
  assert.deepEqual(persisted, ["Paris"]);
});
