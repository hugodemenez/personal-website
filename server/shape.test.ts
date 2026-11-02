import assert from "node:assert/strict";
import test from "node:test";
import { FALLBACK_SHAPE_ACTIVITIES } from "../lib/shape-runs-fallback";
import {
  DISTINCT_PATH_LIMIT,
  decodePolyline,
  encodePolyline,
} from "../lib/shape-runs";
import { fetchActivityGpsMap, resolveRunningPaths } from "./shape";

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

test("fetchActivityGpsMap encodes lat/lng details into a polyline", async () => {
  const lat = [50.63027, 50.63685, 50.63019];
  const lng = [3.06439, 3.06767, 3.03536];
  let requested: string | null = null;

  const encoded = await fetchActivityGpsMap(
    "f7ef731d-0d5f-442e-93cf-4cda890e7d79",
    "shape_test",
    async (input, init) => {
      requested = String(input);
      const headers = init?.headers as Record<string, string> | undefined;
      assert.equal(headers?.Authorization, "Bearer shape_test");
      return new Response(
        JSON.stringify({ channels: { lat, lng } }),
        { status: 200 }
      );
    }
  );

  assert.match(
    requested ?? "",
    /\/activities\/f7ef731d-0d5f-442e-93cf-4cda890e7d79\/details\?/
  );
  assert.match(requested ?? "", /channels=lat%2Clng/);
  assert.match(requested ?? "", /points=500/);
  assert.match(requested ?? "", /includeLaps=false/);
  assert.equal(encoded, encodePolyline([
    [50.63027, 3.06439],
    [50.63685, 3.06767],
    [50.63019, 3.03536],
  ]));
  assert.deepEqual(decodePolyline(encoded ?? ""), [
    [50.63027, 3.06439],
    [50.63685, 3.06767],
    [50.63019, 3.03536],
  ]);
});

test("fetchActivityGpsMap returns null when details have no GPS", async () => {
  const missing = await fetchActivityGpsMap(
    "missing",
    "shape_test",
    async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 })
  );
  const empty = await fetchActivityGpsMap(
    "empty",
    "shape_test",
    async () =>
      new Response(JSON.stringify({ channels: { heartRate: [160, 162] } }), {
        status: 200,
      })
  );

  assert.equal(missing, null);
  assert.equal(empty, null);
});
