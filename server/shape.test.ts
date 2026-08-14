import assert from "node:assert/strict";
import test from "node:test";
import { FALLBACK_SHAPE_ACTIVITIES } from "../lib/shape-runs-fallback";
import { resolveRunningPaths } from "./shape";

test("the checked-in snapshot still draws the two place cards", () => {
  const paths = resolveRunningPaths(FALLBACK_SHAPE_ACTIVITIES);

  assert.equal(paths.length, 2);
  assert.equal(paths[0].count, 14);
  assert.equal(paths[0].spanDays, 36);
  assert.equal(paths[0].totalDistanceLabel, "88.4 km");
  assert.equal(paths[1].count, 17);
  assert.equal(paths[1].spanDays, 129);
  assert.equal(paths[1].totalDistanceLabel, "82.2 km");
  assert.ok(paths[0].sketch?.path);
  assert.ok(paths[1].sketch?.path);
});

test("empty or failed Shape payloads fall back to the snapshot", () => {
  const paths = resolveRunningPaths([]);

  assert.equal(paths.length, 2);
  assert.equal(paths[0].run.title, "Tempo 2km");
  assert.equal(paths[1].run.title, "Afternoon Run");
});
