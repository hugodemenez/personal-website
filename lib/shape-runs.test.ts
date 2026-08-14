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
  spanDays,
  isWalkingActivity,
  selectPrimaryRouteCluster,
  selectRecentRuns,
  toRecentRun,
  buildRouteHeatmapFromRoutes,
  pathContainment,
  selectDistinctPaths,
  sketchRoutes,
  type ShapeActivity,
} from "./shape-runs";

function encodePolyline(points: Array<[number, number]>): string {
  let lastLat = 0;
  let lastLng = 0;
  let result = "";

  const encode = (value: number) => {
    let encoded = value < 0 ? ~(value << 1) : value << 1;
    let chunk = "";
    while (encoded >= 0x20) {
      chunk += String.fromCharCode((0x20 | (encoded & 0x1f)) + 63);
      encoded >>= 5;
    }
    chunk += String.fromCharCode(encoded + 63);
    return chunk;
  };

  for (const [lat, lng] of points) {
    const nextLat = Math.round(lat * 1e5);
    const nextLng = Math.round(lng * 1e5);
    result += encode(nextLat - lastLat);
    result += encode(nextLng - lastLng);
    lastLat = nextLat;
    lastLng = nextLng;
  }

  return result;
}

const LISBON_LOOP: Array<[number, number]> = [
  [38.553, -9.018],
  [38.554, -9.016],
  [38.552, -9.015],
  [38.551, -9.017],
  [38.553, -9.018],
];
const LILLE_LOOP: Array<[number, number]> = [
  [50.665, 3.166],
  [50.667, 3.168],
  [50.666, 3.17],
  [50.664, 3.167],
];

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

test("counts inclusive calendar days between two runs", () => {
  assert.equal(spanDays("2026-08-10T07:00:00Z", "2026-08-14T07:00:00Z"), 5);
  assert.equal(spanDays("2026-08-14", "2026-08-14"), 1);
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

test("pathContainment is high when a short loop sits on a longer one", () => {
  const short = LISBON_LOOP.slice(0, 3);
  assert.ok(pathContainment(short, LISBON_LOOP) > 0.7);
  assert.ok(pathContainment(LISBON_LOOP, LILLE_LOOP) < 0.2);
});

test("selectDistinctPaths keeps one card per similar route", () => {
  const lisbonA = activity({
    id: "lisbon-a",
    date: "2026-08-14T07:00:00Z",
    title: "Tempo 2km",
    map: encodePolyline(LISBON_LOOP),
  });
  const lisbonB = activity({
    id: "lisbon-b",
    date: "2026-08-10T07:00:00Z",
    title: "Tempo 5km",
    distance: 5200,
    duration: 1680,
    map: encodePolyline([
      [38.5532, -9.0181],
      [38.556, -9.012],
      [38.55, -9.014],
      [38.553, -9.018],
    ]),
  });
  const lille = activity({
    id: "lille-1",
    date: "2026-06-30T17:00:00Z",
    title: "Afternoon Run",
    distance: 8000,
    map: encodePolyline(LILLE_LOOP),
  });

  const paths = selectDistinctPaths([lisbonA, lisbonB, lille]);

  assert.equal(paths.length, 2);
  assert.equal(paths[0].run.title, "Tempo 2km");
  assert.equal(paths[0].count, 2);
  assert.equal(paths[0].spanDays, 5);
  assert.equal(paths[0].averageDistanceLabel, "4.9 km");
  assert.equal(paths[0].averageDurationLabel, "26:44");
  assert.equal(paths[0].averagePaceLabel, "5:26/km");
  assert.equal(paths[1].run.title, "Afternoon Run");
  assert.equal(paths[1].count, 1);
  assert.equal(paths[1].spanDays, 1);
  assert.equal(paths[1].averageDistanceLabel, "8.0 km");
  assert.equal(paths[1].averageDurationLabel, "25:28");
  assert.equal(paths[1].averagePaceLabel, "3:11/km");
  assert.ok(paths[0].sketch?.path);
  assert.match(paths[0].sketch?.path ?? "", /^M[\d.]+ [\d.]+(?: L[\d.]+ [\d.]+)+$/);
  assert.equal(paths[0].sketch?.traces.length, 1);
});

test("sketchRoutes draws the latest loop and faint traces of the others", () => {
  const sketch = sketchRoutes([LISBON_LOOP, LILLE_LOOP]);
  assert.ok(sketch);
  assert.equal(sketch?.width, 240);
  assert.equal(sketch?.height, 80);
  assert.match(sketch?.path ?? "", /^M[\d.]+ [\d.]+(?: L[\d.]+ [\d.]+)+$/);
  assert.equal(sketch?.traces.length, 1);
});

test("sketchRoutes keeps every drawn route inside the viewBox", () => {
  const short: Array<[number, number]> = [
    [50.665, 3.166],
    [50.666, 3.167],
    [50.665, 3.168],
  ];
  const long: Array<[number, number]> = [
    [50.66, 3.16],
    [50.67, 3.18],
    [50.66, 3.19],
    [50.65, 3.17],
  ];
  const sketch = sketchRoutes([short, long]);
  const numbers = `${sketch?.path} ${sketch?.traces.join(" ")}`.match(
    /[\d.]+/g
  );
  assert.ok(numbers?.length);
  for (const value of numbers ?? []) {
    const n = Number(value);
    assert.ok(n >= 0);
    assert.ok(n <= 240);
  }
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
