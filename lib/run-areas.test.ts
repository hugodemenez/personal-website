import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRunAreaNames,
  matchRunArea,
  mergeRunArea,
  parseStoredRunAreas,
  stayAreasFromPlaces,
  toStoredRunAreas,
} from "./run-areas";
import type { DistinctPath } from "./shape-runs";

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
    count: 1,
    spanDays: 1,
    sketch: null,
    center: [38.553, -9.018],
    placeName: null,
    averageDistanceLabel: "4.6 km",
    averageDurationLabel: "25:28",
    averagePaceLabel: "5:29/km",
    totalDistanceLabel: "4.6 km",
    ...overrides,
  };
}

test("matches a cluster only when it sits on a known run area", () => {
  const areas = [
    { name: "Azeitão", center: [38.553, -9.018] as [number, number] },
    { name: "Lille", center: [50.665, 3.166] as [number, number] },
  ];

  assert.equal(matchRunArea([38.553, -9.018], areas)?.name, "Azeitão");
  assert.equal(matchRunArea([50.665, 3.166], areas)?.name, "Lille");
  assert.equal(matchRunArea([48.8566, 2.3522], areas), null);
});

test("names cards from known areas and leaves the rest blank", () => {
  const named = applyRunAreaNames(
    [
      path(),
      path({
        run: { ...path().run, id: "run-2" },
        center: [48.8566, 2.3522],
      }),
    ],
    [{ name: "Azeitão", center: [38.52, -9.02] }]
  );

  assert.equal(named[0].placeName, "Azeitão");
  assert.equal(named[1].placeName, null);
});

test("does not add a cluster that already has a nearby name", () => {
  const areas = [{ name: "Azeitão", center: [38.553, -9.018] as [number, number] }];
  const merged = mergeRunArea(areas, {
    name: "Setúbal",
    center: [38.55, -9.02],
  });

  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, "Azeitão");
});

test("reads stored run areas and stay cities as name sources", () => {
  assert.deepEqual(
    parseStoredRunAreas({
      version: 1,
      areas: [{ name: "Lille", latitude: 50.665, longitude: 3.166 }],
    }),
    [{ name: "Lille", center: [50.665, 3.166] }]
  );
  assert.deepEqual(parseStoredRunAreas({ version: 2, areas: [] }), []);
  assert.deepEqual(
    stayAreasFromPlaces([{ city: "Azeitão", latitude: 38.52, longitude: -9.02 }]),
    [{ name: "Azeitão", center: [38.52, -9.02] }]
  );
  assert.equal(toStoredRunAreas([{ name: "Lille", center: [50.6651, 3.1662] }]).version, 1);
});
