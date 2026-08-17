import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRunAreaNames,
  matchRunArea,
  STAY_MATCH_RADIUS_KM,
  stayAreasFromPlaces,
} from "./run-areas";
import { CLUSTER_RADIUS_KM } from "./shape-runs";
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
    { name: "Portugal", center: [38.553, -9.018] as [number, number] },
    { name: "France", center: [50.63, 3.06] as [number, number] },
  ];

  assert.equal(matchRunArea([38.553, -9.018], areas)?.name, "Portugal");
  assert.equal(matchRunArea([50.63, 3.06], areas)?.name, "France");
  assert.equal(matchRunArea([48.8566, 2.3522], areas), null);
});

test("names a nearby loop from a stay just beyond the cluster radius", () => {
  const nearbyCluster: [number, number] = [50.669, 3.173];
  const franceStay = { name: "France", center: [50.63, 3.06] as [number, number] };
  const portugalStay = {
    name: "Portugal",
    center: [38.52, -9.02] as [number, number],
  };

  assert.ok(STAY_MATCH_RADIUS_KM > CLUSTER_RADIUS_KM);
  assert.equal(matchRunArea(nearbyCluster, [franceStay], CLUSTER_RADIUS_KM), null);
  assert.equal(matchRunArea(nearbyCluster, [franceStay])?.name, "France");
  assert.equal(matchRunArea(nearbyCluster, [portugalStay]), null);
});

test("prefers the nearer stay when two stays both match", () => {
  assert.deepEqual(
    matchRunArea(
      [50.669, 3.173],
      [
        { name: "France", center: [50.63, 3.06] },
        { name: "France", center: [50.68, 3.15] },
      ]
    )?.center,
    [50.68, 3.15]
  );
});

test("names cards from recent stays and leaves the rest blank", () => {
  const named = applyRunAreaNames(
    [
      path(),
      path({
        run: { ...path().run, id: "run-2" },
        center: [50.669, 3.173],
      }),
      path({
        run: { ...path().run, id: "run-3" },
        center: [48.8566, 2.3522],
      }),
    ],
    [
      { name: "Portugal", center: [38.52, -9.02] },
      { name: "France", center: [50.63, 3.06] },
    ]
  );

  assert.equal(named[0].placeName, "Portugal");
  assert.equal(named[1].placeName, "France");
  assert.equal(named[2].placeName, null);
});

test("labels stays with the country", () => {
  assert.deepEqual(
    stayAreasFromPlaces([
      {
        country: "Portugal",
        latitude: 38.52,
        longitude: -9.02,
      },
    ]),
    [{ name: "Portugal", center: [38.52, -9.02] }]
  );
});
