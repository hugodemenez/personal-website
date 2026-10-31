import assert from "node:assert/strict";
import test from "node:test";
import { ANATOMY, MODEL_SPAN, PAPER } from "./plane-mesh";

test("Anatomy 3D plane keeps the original kit proportions", () => {
  assert.equal(ANATOMY.nose, 62);
  assert.equal(ANATOMY.propR, 17);
  assert.equal(ANATOMY.span, 75);
  assert.equal(ANATOMY.wingZ, 34);
  assert.equal(ANATOMY.chord, 26);
  assert.equal(MODEL_SPAN, 150);
});

test("paper palette matches the Anatomy light-theme kit", () => {
  assert.equal(PAPER.light.face, 0xffffff);
  assert.equal(PAPER.light.paper, 0xfbfbfa);
  assert.equal(PAPER.light.shade0, 0xdcdcd9);
  assert.equal(PAPER.light.ink, 0x26262a);
});
