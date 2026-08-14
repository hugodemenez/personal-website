import assert from "node:assert/strict";
import test from "node:test";
import type { VisitedPlace } from "../server/location-data";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  WANTED_PLACES,
  continentPaths,
  continentRing,
  projectLocation,
  stayKind,
  wantedCircles,
  zoneCenter,
  zoneCircles,
} from "./world-map";

const lisbon: VisitedPlace = {
  city: "Lisbon",
  country: "Portugal",
  latitude: 39,
  longitude: -9,
  days: 40,
  isCurrent: true,
  isHomeBase: false,
};

const paris: VisitedPlace = {
  city: "Paris",
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

  const lisbonPoint = projectLocation(-9.14, 38.72);
  const parisPoint = projectLocation(2.35, 48.86);
  assert.ok(parisPoint.x - lisbonPoint.x > 20);
  assert.ok(lisbonPoint.y - parisPoint.y > 16);
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
  const places = [lisbon, paris];
  assert.equal(stayKind(lisbon, places), "habitual");
  assert.equal(stayKind(paris, places), "casual");
  assert.equal(
    stayKind(
      { ...lisbon, days: null, isHomeBase: true },
      [{ ...lisbon, days: null, isHomeBase: true }]
    ),
    "habitual"
  );
});

test("circles a region instead of pinning a city", () => {
  const [circle] = zoneCircles([lisbon]);
  assert.ok(circle);
  assert.equal(circle.kind, "habitual");
  assert.equal(circle.label, "Lisbon");
  assert.match(circle.path, /^M /);
  assert.ok(!circle.path.endsWith("Z"));
  assert.ok(circle.width < 4);
  assert.ok((circle.path.match(/Q /g) ?? []).length >= 16);

  const snapped = zoneCenter(lisbon);
  const exact = projectLocation(lisbon.longitude, lisbon.latitude);
  assert.ok(Math.hypot(snapped.x - exact.x, snapped.y - exact.y) < 30);
});

test("keeps nearby Europe stays as two open circles on the world plane", () => {
  const circles = zoneCircles([lisbon, paris]);
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
  assert.ok(sanFrancisco.dashed);
  assert.ok(canada.dashed);
  assert.ok(sanFrancisco.x < canada.x);
  assert.ok(sanFrancisco.y > canada.y);
  assert.ok((canada.path.match(/Q /g) ?? []).length >= 12);
});
