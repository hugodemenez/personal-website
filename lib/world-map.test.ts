import assert from "node:assert/strict";
import test from "node:test";
import type { VisitedPlace } from "../server/location-data";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  WANTED_PLACES,
  closestPlaceCircle,
  continentPaths,
  continentRing,
  drawOrder,
  projectLocation,
  stayKind,
  wantedCircles,
  zoneCenter,
  zoneCircles,
} from "./world-map";

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

test("circles the United States and Canada as places still ahead", () => {
  const circles = wantedCircles();
  assert.deepEqual(
    circles.map((circle) => circle.label),
    WANTED_PLACES.map((place) => place.name)
  );

  const unitedStates = circles.find((circle) => circle.label === "United States");
  const canada = circles.find((circle) => circle.label === "Canada");
  assert.ok(unitedStates);
  assert.ok(canada);
  assert.equal(unitedStates.kind, "wanted");
  assert.equal(canada.kind, "wanted");
  assert.ok(unitedStates.hitRadius >= 36);
  assert.ok(canada.hitRadius >= 36);
  assert.ok(unitedStates.x < canada.x);
  assert.ok(unitedStates.y > canada.y);
  assert.ok(
    Math.hypot(canada.x - unitedStates.x, canada.y - unitedStates.y) > 70,
    "the United States and Canada should not read as one North American scribble"
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
