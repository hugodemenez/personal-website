import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const appDir = join(process.cwd(), "app");
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function pngSize(buf: Buffer) {
  assert.ok(buf.subarray(0, 8).equals(pngSignature), "expected a PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test("ships app/icon.png so Next.js emits a PNG rel=icon tag", () => {
  const icon = readFileSync(join(appDir, "icon.png"));
  assert.deepEqual(pngSize(icon), { width: 32, height: 32 });
});

test("ships app/apple-icon.png so Next.js emits apple-touch-icon", () => {
  const icon = readFileSync(join(appDir, "apple-icon.png"));
  assert.deepEqual(pngSize(icon), { width: 180, height: 180 });
});

test("ships app/favicon.ico so Next.js serves /favicon.ico", () => {
  const ico = readFileSync(join(appDir, "favicon.ico"));
  const type = ico.readUInt16LE(2);
  const count = ico.readUInt16LE(4);
  assert.equal(type, 1);
  assert.ok(count >= 3, `expected several ICO sizes, got ${count}`);
});
