import assert from "node:assert/strict";
import test from "node:test";
import {
  DRAW_MS,
  DRAW_VISIBLE_RATIO,
  shouldStartDraw,
} from "./path-draw";

test("path maps start the 1s draw once one-third is in view", () => {
  assert.equal(DRAW_MS, 1000);
  assert.equal(DRAW_VISIBLE_RATIO, 1 / 3);
  assert.equal(shouldStartDraw(0), false);
  assert.equal(shouldStartDraw(0.32), false);
  assert.equal(shouldStartDraw(1 / 3), true);
  assert.equal(shouldStartDraw(0.5), true);
  assert.equal(shouldStartDraw(1), true);
});
