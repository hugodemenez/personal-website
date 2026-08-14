import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarDate,
  decodePolyline,
  polylineToSvgPath,
  formatDistance,
  formatDuration,
  formatPace,
  formatRunDate,
  isWalkingActivity,
  selectPrimaryRouteCluster,
  selectRecentRuns,
  toRecentRun,
  buildRouteHeatmapFromRoutes,
  type ShapeActivity,
} from "./shape-runs";

function activity(overrides: Partial<ShapeActivity> = {}): ShapeActivity {
  return {
    id: "run-1",
    date: "2026-08-14T05:16:21.000Z",
    title: "Tempo 2km",
    sportType: "run",
    distance: 4645.6,
    duration: 1528,
    speed: 3.04,
    completed: true,
    source: "strava",
    externalId: "19734950528",
    ...overrides,
  };
}

test("reads the calendar day from Shape timestamps", () => {
  assert.equal(calendarDate("2026-08-14T05:16:21.000Z"), "2026-08-14");
  assert.equal(calendarDate("2026-08-14"), "2026-08-14");
});

test("formats run stats for the homepage list", () => {
  assert.equal(formatRunDate("2026-08-14T05:16:21.000Z"), "Aug 14");
  assert.equal(formatDistance(4645.6), "4.6 km");
  assert.equal(formatDuration(1528), "25:28");
  assert.equal(formatDuration(4250), "1:10:50");
  assert.equal(formatPace(4645.6, 1528), "5:29/km");
});

test("treats walks and walking-pace activities as non-runs", () => {
  assert.equal(isWalkingActivity(activity({ title: "Walk" })), true);
  assert.equal(isWalkingActivity(activity({ speed: 1.02 })), true);
  assert.equal(
    isWalkingActivity(activity({ speed: null, distance: 2377, duration: 3110 })),
    true
  );
  assert.equal(isWalkingActivity(activity()), false);
});

test("keeps the richer copy when Strava and HealthKit both logged a run", () => {
  const selected = selectRecentRuns([
    activity({
      id: "healthkit",
      title: "Running",
      source: "healthkit",
      externalId: "health-1",
      heartRate: null,
      map: null,
    }),
    activity({
      id: "strava",
      title: "Morning Run",
      source: "strava",
      externalId: "19384455301",
      heartRate: 156.4,
      map: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
    }),
    activity({
      id: "walk",
      title: "Walk",
      distance: 2377,
      duration: 3110,
      speed: 1.02,
    }),
    activity({
      id: "older",
      date: "2026-08-12T05:42:09.000Z",
      title: "Mile Repeats",
      distance: 7429.8,
      duration: 2501,
    }),
  ]);

  assert.deepEqual(
    selected.map((run) => run.id),
    ["strava", "older"]
  );
});

test("decodes a Google encoded polyline", () => {
  assert.deepEqual(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [
    [38.5, -120.2],
    [40.7, -120.95],
    [43.252, -126.453],
  ]);
});

test("turns a polyline into an SVG path", () => {
  const path = polylineToSvgPath("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
  assert.equal(typeof path, "string");
  assert.match(path ?? "", /^M[\d.]+ [\d.]+(?: L[\d.]+ [\d.]+)+$/);
});

test("keeps nearby routes together and drops a distant one", () => {
  const lisbonLoop: Array<[number, number]> = [
    [38.553, -9.018],
    [38.554, -9.016],
    [38.552, -9.015],
  ];
  const sameLoop: Array<[number, number]> = [
    [38.5531, -9.0181],
    [38.5542, -9.0162],
    [38.5521, -9.0151],
  ];
  const lille: Array<[number, number]> = [
    [50.665, 3.166],
    [50.667, 3.168],
  ];

  const cluster = selectPrimaryRouteCluster([lisbonLoop, sameLoop, lille]);
  assert.equal(cluster.length, 2);
});

test("merges overlapping streets into a frequency heatmap", () => {
  const shared: Array<[number, number]> = [
    [38.55, -9.02],
    [38.551, -9.018],
    [38.552, -9.016],
  ];
  const withSpur: Array<[number, number]> = [
    [38.55, -9.02],
    [38.551, -9.018],
    [38.553, -9.014],
  ];

  const heatmap = buildRouteHeatmapFromRoutes([shared, shared, withSpur]);
  assert.ok(heatmap);
  assert.equal(heatmap?.routeCount, 3);
  assert.ok((heatmap?.edges.length ?? 0) > 0);
  assert.equal(
    Math.max(...(heatmap?.edges.map((edge) => edge.intensity) ?? [])),
    1
  );
});

test("maps a Shape activity onto the homepage card", () => {
  assert.deepEqual(toRecentRun(activity()), {
    id: "run-1",
    title: "Tempo 2km",
    date: "2026-08-14",
    dateLabel: "Aug 14",
    distanceLabel: "4.6 km",
    durationLabel: "25:28",
    paceLabel: "5:29/km",
    mapPath: null,
    href: "https://www.strava.com/activities/19734950528",
  });
});
