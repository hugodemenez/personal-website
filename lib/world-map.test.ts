import assert from "node:assert/strict";
import test from "node:test";
import type { VisitedPlace } from "../server/location-data";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  continentPaths,
  continentRing,
  projectLocation,
  stayKind,
  zoneBrushes,
  zoneCenter,
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

test("paints a broad highlighter zone instead of a pin", () => {
  const [brush] = zoneBrushes([lisbon]);
  assert.ok(brush);
  assert.equal(brush.kind, "habitual");
  assert.match(brush.path, /^M /);
  assert.ok(brush.width > 16);

  const snapped = zoneCenter(lisbon);
  const exact = projectLocation(lisbon.longitude, lisbon.latitude);
  assert.ok(Math.hypot(snapped.x - exact.x, snapped.y - exact.y) < 30);
});
