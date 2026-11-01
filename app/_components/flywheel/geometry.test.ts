import assert from "node:assert/strict";
import test from "node:test";
import { linkage, rodPath, W } from "./geometry";
import { H0, P, translateAlong } from "./projection";

test("one clockwise turn walks the carriage and returns the crank pin", () => {
  const rest = linkage(0);
  const half = linkage(180);
  const turn = linkage(360);
  assert.ok(Number.isFinite(rest.slide));
  assert.ok(half.slide < rest.slide);
  assert.ok(Math.abs(turn.slide - rest.slide) < 1e-9);
  assert.ok(Math.abs(turn.pin[0] - rest.pin[0]) < 1e-9);
  assert.equal(rest.end[1], W.railZ);
});

test("rod path is a closed outline with two eyes", () => {
  const d = rodPath(linkage(0));
  assert.match(d, /^M/);
  assert.equal([...d.matchAll(/Z/g)].length, 3);
});

test("translateAlong is a no-op at the origin and moves the slider along world y", () => {
  assert.equal(translateAlong(P, [0, 0, 0]), "translate(0 0)");
  const rest = translateAlong(P, [0, linkage(0).slide, 0]);
  const mid = translateAlong(P, [0, linkage(90).slide, 0]);
  assert.match(rest, /^translate\(-?\d+(\.\d+)? -?\d+(\.\d+)?\)$/);
  assert.notEqual(rest, mid);
});

test("handle rest pose matches the baked rim offset", () => {
  assert.deepEqual(H0, [0, 64, 0]);
  assert.equal(translateAlong(P, [0, 0, 0]), "translate(0 0)");
}
)