import assert from "node:assert/strict";
import test from "node:test";
import { clientToNdc, dragModeFor, pixelBounds, shouldClaimPointer } from "./pointer";

test("client coordinates map to Three.js NDC", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };
  assert.deepEqual(clientToNdc(0, 0, rect), { x: -1, y: 1 });
  assert.deepEqual(clientToNdc(200, 100, rect), { x: 1, y: -1 });
  assert.deepEqual(clientToNdc(100, 50, rect), { x: 0, y: 0 });
});

test("offset canvas rect still maps the centre to the origin", () => {
  const ndc = clientToNdc(150, 80, { left: 50, top: 30, width: 200, height: 100 });
  assert.ok(Math.abs(ndc.x) < 1e-9);
  assert.ok(Math.abs(ndc.y) < 1e-9);
});

test("primary drag moves; shift, right button, or a second pointer orbits", () => {
  assert.equal(dragModeFor({ button: 0 }), "move");
  assert.equal(dragModeFor({ button: 0, shiftKey: true }), "orbit");
  assert.equal(dragModeFor({ button: 2 }), "orbit");
  assert.equal(dragModeFor({ button: 0 }, 1), "orbit");
});

test("empty sky never claims the pointer", () => {
  assert.equal(shouldClaimPointer(false, false), false);
  assert.equal(shouldClaimPointer(true, false), true);
  assert.equal(shouldClaimPointer(false, true), true);
});

test("viewport bounds keep a margin", () => {
  const bounds = pixelBounds(800, 600, 40);
  assert.deepEqual(bounds, { minX: 40, maxX: 760, minY: 40, maxY: 560 });
});
