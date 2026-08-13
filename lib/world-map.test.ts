import assert from "node:assert/strict";
import test from "node:test";
import type { VisitedPlace } from "../server/location-data";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  continentPaths,
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
