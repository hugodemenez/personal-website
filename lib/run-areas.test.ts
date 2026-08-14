import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRunAreaNames,
  matchRunArea,
  stayAreasFromPlaces,
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

test("matches a cluster only when it sits on a known stay", () => {
  const areas = [
    { name: "Azeitão", center: [38.553, -9.018] as [number, number] },
    { name: "Lille", center: [50.665, 3.166] as [number, number] },
  ];

  assert.equal(matchRunArea([38.553, -9.018], areas)?.name, "Azeitão");
  assert.equal(matchRunArea([50.665, 3.166], areas)?.name, "Lille");
  assert.equal(matchRunArea([48.8566, 2.3522], areas), null);
});

test("names cards from recent stays and leaves the rest blank", () => {
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

test("reads stay cities as name sources", () => {
  assert.deepEqual(
    stayAreasFromPlaces([{ city: "Azeitão", latitude: 38.52, longitude: -9.02 }]),
    [{ name: "Azeitão", center: [38.52, -9.02] }]
  );
});
