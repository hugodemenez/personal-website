import assert from "node:assert/strict";
import test from "node:test";
import type { VisitedPlace } from "../server/location-data";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  continentPaths,
  continentRing,
  formatStay,
  markerRadius,
  projectLocation,
} from "./world-map";

const samplePlace = {
  city: "Lisbon",
  country: "Portugal",
  latitude: 39,
  longitude: -9,
  isCurrent: true,
  isHomeBase: false,
} satisfies Omit<VisitedPlace, "days">;

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

  const lisbon = projectLocation(-9.14, 38.72);
  const paris = projectLocation(2.35, 48.86);
  assert.ok(paris.x - lisbon.x > 20);
  assert.ok(lisbon.y - paris.y > 16);
});

test("builds closed continent sketches and sizes markers by days", () => {
  const paths = continentPaths();
  assert.ok(paths.length >= 8);
  for (const path of paths) {
    assert.match(path.d, /^M /);
    assert.match(path.d, /Z$/);
  }

  assert.ok(markerRadius(1) < markerRadius(16));
  assert.ok(markerRadius(400) <= 11);
  assert.equal(formatStay({ ...samplePlace, days: 1 }), "1 day");
  assert.equal(formatStay({ ...samplePlace, days: 12 }), "12 days");
  assert.equal(
    formatStay({ ...samplePlace, days: null, isHomeBase: true }),
    "Home base"
  );
});
