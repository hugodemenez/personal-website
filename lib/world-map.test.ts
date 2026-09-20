import assert from "node:assert/strict";
import test from "node:test";
import type { VisitedPlace } from "../server/location-data";
import {
  GLOBAL_MARK,
  MAP_HEIGHT,
  MAP_WIDTH,
  WANTED_PLACES,
  applyResumeToStayCircles,
  closestPlaceCircle,
  continentPaths,
  continentRing,
  drawOrder,
  projectLocation,
  resumeCircles,
  resumeRadius,
  stayKind,
  wantedCircles,
  zoneCenter,
  zoneCircles,
} from "./world-map";
import { RESUME_PLACES } from "./resume-places";

const portugal: VisitedPlace = {
  country: "Portugal",
  latitude: 39,
  longitude: -9,
  days: 40,
  isCurrent: true,
  isHomeBase: false,
};

const france: VisitedPlace = {
  country: "France",
  latitude: 49,
  longitude: 2,
  days: 12,
  isCurrent: false,
  isHomeBase: false,
};

test("projects lon/lat onto the sketch plane", () => {
  assert.deepEqual(projectLocation(-180, 90), { x: 0, y: 0 });
  assert.deepEqual(projectLocation(180, -90), { x: MAP_WIDTH, y: MAP_HEIGHT });
  assert.deepEqual(projectLocation(0, 0), { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
});

test("keeps Iberia and the Bay of Biscay distinct on the Europe sketch", () => {
  const europe = continentRing("Europe");
  assert.ok(europe);
  assert.ok(
    europe.some(([longitude, latitude]) => longitude <= -12 && latitude > 37 && latitude < 41),
    "Portugal's west coast should stick out"
  );
  assert.ok(
    europe.some(([longitude, latitude]) => longitude > -1 && longitude < 2 && latitude > 44 && latitude < 47),
    "the Bay of Biscay should indent between Iberia and France"
  );

  const portugalPoint = projectLocation(-9.14, 38.72);
  const francePoint = projectLocation(2.35, 48.86);
  assert.ok(francePoint.x - portugalPoint.x > 20);
  assert.ok(portugalPoint.y - francePoint.y > 16);
});

test("builds closed continent sketches", () => {
  const paths = continentPaths();
  assert.ok(paths.length >= 8);
  for (const path of paths) {
    assert.match(path.d, /^M /);
    assert.match(path.d, /Z$/);
  }
});

test("classifies long stays as most of the time and the rest as casual", () => {
  const places = [portugal, france];
  assert.equal(stayKind(portugal, places), "habitual");
  assert.equal(stayKind(france, places), "casual");
  assert.equal(
    stayKind(
      { ...portugal, days: null, isHomeBase: true },
      [{ ...portugal, days: null, isHomeBase: true }]
    ),
    "habitual"
  );
});

test("circles a region instead of pinning a precise stay", () => {
  const [circle] = zoneCircles([portugal]);
  assert.ok(circle);
  assert.equal(circle.kind, "habitual");
  assert.equal(circle.label, "Portugal");
  assert.match(circle.path, /^M /);
  assert.ok(!circle.path.endsWith("Z"));
  assert.ok(circle.width < 4);
  assert.ok((circle.path.match(/Q /g) ?? []).length >= 16);

  const snapped = zoneCenter(portugal);
  const exact = projectLocation(portugal.longitude, portugal.latitude);
  assert.ok(Math.hypot(snapped.x - exact.x, snapped.y - exact.y) < 30);
});

test("keeps nearby Europe stays as two open circles on the world plane", () => {
  const circles = zoneCircles([portugal, france]);
  assert.equal(circles.length, 2);
  assert.ok(Math.hypot(circles[0].x - circles[1].x, circles[0].y - circles[1].y) > 18);
});

test("circles San Francisco and Canada as places still ahead", () => {
  const circles = wantedCircles();
  assert.deepEqual(
    circles.map((circle) => circle.label),
    WANTED_PLACES.map((place) => place.name)
  );

  const sanFrancisco = circles.find((circle) => circle.label === "San Francisco");
  const canada = circles.find((circle) => circle.label === "Canada");
  assert.ok(sanFrancisco);
  assert.ok(canada);
  assert.equal(sanFrancisco.kind, "wanted");
  assert.equal(canada.kind, "wanted");
  assert.ok(sanFrancisco.hitRadius >= 36);
  assert.ok(canada.hitRadius >= 36);
  assert.ok(sanFrancisco.x < canada.x);
  assert.ok(sanFrancisco.y > canada.y);
  assert.ok(
    Math.hypot(canada.x - sanFrancisco.x, canada.y - sanFrancisco.y) > 70,
    "San Francisco and Canada should not read as one North American scribble"
  );
  assert.ok((canada.path.match(/Q /g) ?? []).length >= 12);
});

test("picks the closest circle inside a broad hit zone", () => {
  const [portugalMark, franceMark] = zoneCircles([portugal, france]);
  assert.ok(portugalMark);
  assert.ok(franceMark);

  const nearerPortugal = closestPlaceCircle(
    { x: portugalMark.x + 10, y: portugalMark.y + 8 },
    [portugalMark, franceMark]
  );
  assert.equal(nearerPortugal?.label, "Portugal");

  const miss = closestPlaceCircle(
    { x: portugalMark.x + 200, y: portugalMark.y + 200 },
    [portugalMark, franceMark]
  );
  assert.equal(miss, null);
});

test("draws circles west to east so they appear one by one", () => {
  const ordered = drawOrder([...wantedCircles(), ...zoneCircles([portugal, france])]);
  for (let index = 1; index < ordered.length; index += 1) {
    assert.ok(ordered[index].x >= ordered[index - 1].x);
  }
});

function pathExtents(path: string) {
  const numbers = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) =>
    Number(match[0])
  );
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let index = 0; index < numbers.length; index += 2) {
    minX = Math.min(minX, numbers[index] ?? Infinity);
    maxX = Math.max(maxX, numbers[index] ?? -Infinity);
    minY = Math.min(minY, numbers[index + 1] ?? Infinity);
    maxY = Math.max(maxY, numbers[index + 1] ?? -Infinity);
  }

  return { minX, maxX, minY, maxY };
}

test("hides CV beats on the map and folds them into matching stays", () => {
  const labels = resumeCircles().map((circle) => circle.label);
  assert.deepEqual(
    labels.sort(),
    ["Foundever", "France", "Harvard", "Portugal"].sort()
  );
  assert.ok(resumeCircles().every((circle) => circle.kind === "resume" && circle.detail));

  const harvard = resumeCircles().find((circle) => circle.label === "Harvard");
  const foundever = resumeCircles().find((circle) => circle.label === "Foundever");
  const sanFrancisco = wantedCircles().find((circle) => circle.label === "San Francisco");
  assert.ok(harvard);
  assert.ok(foundever);
  assert.ok(sanFrancisco);
  assert.ok(harvard.x > sanFrancisco.x);
  assert.equal(foundever.x, GLOBAL_MARK.x);
  assert.equal(foundever.y, GLOBAL_MARK.y);
  assert.equal(foundever.global, true);
  assert.ok(foundever.hitRadius >= Math.hypot(MAP_WIDTH / 2, MAP_HEIGHT / 2) - 1);

  const merged = applyResumeToStayCircles(zoneCircles([portugal, france]));
  const portugalMark = merged.find((circle) => circle.label === "Portugal");
  const franceMark = merged.find((circle) => circle.label === "France");
  assert.equal(portugalMark?.kind, "habitual");
  assert.equal(portugalMark?.detail, RESUME_PLACES.find((place) => place.country === "Portugal")?.detail);
  assert.equal(franceMark?.kind, "casual");
  assert.equal(franceMark?.detail, RESUME_PLACES.find((place) => place.country === "France")?.detail);
  assert.equal(merged.filter((circle) => circle.label === "Portugal").length, 1);
  assert.ok(merged.some((circle) => circle.label === "Harvard"));
  assert.ok(merged.some((circle) => circle.label === "Foundever"));
});

test("draws the global resume mark as a scribble around the whole map", () => {
  assert.ok(resumeRadius("global") >= MAP_WIDTH / 2 - 24);
  assert.ok(resumeRadius("global") > resumeRadius("region") * 8);
  assert.equal(GLOBAL_MARK.radiusX, MAP_WIDTH / 2 - 16);
  assert.equal(GLOBAL_MARK.radiusY, MAP_HEIGHT / 2 - 14);

  const foundever = resumeCircles().find((circle) => circle.label === "Foundever");
  assert.ok(foundever);
  const extents = pathExtents(foundever.path);
  assert.ok(
    extents.maxX - extents.minX > MAP_WIDTH * 0.88,
    "global scribble should span nearly the map width"
  );
  assert.ok(
    extents.maxY - extents.minY > MAP_HEIGHT * 0.82,
    "global scribble should span nearly the map height"
  );
  assert.ok(extents.minX < 40);
  assert.ok(extents.maxX > MAP_WIDTH - 40);
  assert.ok(extents.minY < 40);
  assert.ok(extents.maxY > MAP_HEIGHT - 40);
});

test("prefers city and region hits over the global ring", () => {
  const merged = applyResumeToStayCircles(zoneCircles([portugal, france]));
  const circles = [...wantedCircles(), ...merged];
  const portugalMark = merged.find((circle) => circle.label === "Portugal");
  const franceMark = merged.find((circle) => circle.label === "France");
  const foundever = merged.find((circle) => circle.label === "Foundever");
  const sanFrancisco = wantedCircles().find((circle) => circle.label === "San Francisco");
  assert.ok(portugalMark);
  assert.ok(franceMark);
  assert.ok(foundever);
  assert.ok(sanFrancisco);

  assert.equal(
    closestPlaceCircle({ x: portugalMark.x + 8, y: portugalMark.y + 6 }, circles)?.label,
    "Portugal"
  );
  assert.equal(
    closestPlaceCircle({ x: franceMark.x, y: franceMark.y }, circles)?.label,
    "France"
  );
  assert.equal(
    closestPlaceCircle({ x: sanFrancisco.x, y: sanFrancisco.y }, circles)?.label,
    "San Francisco"
  );

  const emptyOcean = closestPlaceCircle({ x: 210, y: 300 }, circles);
  assert.equal(emptyOcean?.label, "Foundever");

  const mapCenter = closestPlaceCircle(
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 },
    circles
  );
  assert.equal(mapCenter?.label, "Foundever");

  const hoverInterior = closestPlaceCircle(
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 },
    circles,
    { globalFallback: false }
  );
  assert.equal(hoverInterior, null);

  const ringPoint = {
    x: foundever.x + (foundever.radiusX ?? GLOBAL_MARK.radiusX),
    y: foundever.y,
  };
  assert.equal(
    closestPlaceCircle(ringPoint, circles, { globalFallback: false })?.label,
    "Foundever"
  );
});

test("draws the global ring first, then remaining marks west to east", () => {
  const ordered = drawOrder([
    ...wantedCircles(),
    ...applyResumeToStayCircles(zoneCircles([portugal, france])),
  ]);
  assert.equal(ordered[0]?.label, "Foundever");
  assert.equal(ordered[0]?.global, true);
  const rest = ordered.slice(1);
  for (let index = 1; index < rest.length; index += 1) {
    assert.ok(rest[index].x >= rest[index - 1].x);
  }
});
