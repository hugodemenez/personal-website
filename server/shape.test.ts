import assert from "node:assert/strict";
import test from "node:test";
import { FALLBACK_SHAPE_ACTIVITIES } from "../lib/shape-runs-fallback";
import { DISTINCT_PATH_LIMIT } from "../lib/shape-runs";
import { resolveRunningPaths } from "./shape";

test("the checked-in snapshot still draws one card per recent run", () => {
  const paths = resolveRunningPaths(FALLBACK_SHAPE_ACTIVITIES);

  assert.equal(paths.length, DISTINCT_PATH_LIMIT);
  assert.equal(new Set(paths.map((path) => path.run.id)).size, paths.length);
  assert.equal(paths[0].run.title, "Tempo 2km");
  assert.equal(paths[1].run.title, "Mile Repeats");
  for (const path of paths) {
    assert.equal(path.placeName, null);
    assert.ok(path.sketch?.path);
    assert.equal(path.sketch?.traces.length, 0);
  }
});

test("empty or failed Shape payloads fall back to the snapshot", () => {
  const paths = resolveRunningPaths([]);

  assert.equal(paths.length, DISTINCT_PATH_LIMIT);
  assert.equal(paths[0].run.title, "Tempo 2km");
  assert.equal(paths[1].run.title, "Mile Repeats");
});
