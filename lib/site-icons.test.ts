import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const publicDir = join(process.cwd(), "public");
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function pngSize(buf: Buffer) {
  assert.ok(buf.subarray(0, 8).equals(pngSignature), "expected a PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test("ships a 32x32 PNG favicon for Safari on iPad", () => {
  const icon = readFileSync(join(publicDir, "icon.png"));
  assert.deepEqual(pngSize(icon), { width: 32, height: 32 });
});

test("ships a 180x180 apple-touch-icon at the path iOS requests", () => {
  const icon = readFileSync(join(publicDir, "apple-touch-icon.png"));
  assert.deepEqual(pngSize(icon), { width: 180, height: 180 });
});

test("keeps a multi-size ICO so desktop browsers still have /favicon.ico", () => {
  const ico = readFileSync(join(publicDir, "favicon.ico"));
  const type = ico.readUInt16LE(2);
  const count = ico.readUInt16LE(4);
  assert.equal(type, 1);
  assert.ok(count >= 3, `expected several ICO sizes, got ${count}`);
});
