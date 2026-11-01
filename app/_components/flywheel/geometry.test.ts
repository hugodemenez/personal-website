import assert from "node:assert/strict";
import test from "node:test";
import { leverPath, linkage, rodPath, W } from "./geometry";
import { H0, P, translateAlong } from "./projection";

test("one clockwise turn walks the carriage out and back", () => {
  const rest = linkage(0);
  const mid = linkage(180);
  const turn = linkage(360);
  assert.ok(Number.isFinite(rest.slide));
  assert.notEqual(mid.slide, rest.slide);
  assert.ok(Math.abs(turn.slide - rest.slide) < 1e-6);
  assert.ok(Math.abs(turn.pin[0] - rest.pin[0]) < 1e-6);
  assert.equal(W.ratio, 3);
});

test("rod and lever paths are closed outlines with eyes", () => {
  const link = linkage(0);
  const rod = rodPath(link);
  const lever = leverPath(link);
  assert.match(rod, /^M/);
  assert.match(lever, /^M/);
  assert.equal([...rod.matchAll(/Z/g)].length, 3);
  assert.equal([...lever.matchAll(/Z/g)].length, 3);
});

test("translateAlong is a no-op at the origin and moves the carriage along world x", () => {
  assert.equal(translateAlong(P, [0, 0, 0]), "translate(0 0)");
  const rest = translateAlong(P, [linkage(0).slide, 0, 0]);
  const mid = translateAlong(P, [linkage(90).slide, 0, 0]);
  assert.match(rest, /^translate\(-?\d+(\.\d+)? -?\d+(\.\d+)?\)$/);
  assert.notEqual(rest, mid);
});

test("handle rest pose matches the baked rim offset", () => {
  assert.deepEqual(H0, [0, 47, 0]);
  assert.equal(P.scale > 1, true);
}
)