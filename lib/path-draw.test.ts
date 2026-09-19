import assert from "node:assert/strict";
import test from "node:test";
import {
  DRAW_MS,
  INSTANT_VISIBLE_RATIO,
  shouldRevealImmediately,
} from "./path-draw";

test("path maps already one-third in view skip the draw animation", () => {
  assert.equal(DRAW_MS, 1000);
  assert.equal(INSTANT_VISIBLE_RATIO, 1 / 3);
  assert.equal(shouldRevealImmediately(0), false);
  assert.equal(shouldRevealImmediately(0.32), false);
  assert.equal(shouldRevealImmediately(1 / 3), true);
  assert.equal(shouldRevealImmediately(0.5), true);
  assert.equal(shouldRevealImmediately(1), true);
});
