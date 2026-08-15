import assert from "node:assert/strict";
import test from "node:test";
import {
  sampleInkParticles,
  wrapDescriptionLines,
} from "./description-dissolve";

test("wraps a description onto the next line when a word no longer fits", () => {
  const lines = wrapDescriptionLines(
    "one two three four",
    9,
    (value) => value.length
  );
  assert.deepEqual(lines, ["one two", "three", "four"]);
});

test("samples only inked pixels", () => {
  const width = 4;
  const height = 1;
  const data = new Uint8ClampedArray(width * height * 4);
  data[7] = 200;
  data[4] = 41;
  data[5] = 37;
  data[6] = 36;

  const particles = sampleInkParticles(data, width, height, 1);
  assert.equal(particles.length, 1);
  assert.equal(particles[0]?.x, 1);
  assert.ok((particles[0]?.r ?? 0) > 0);
});
