import assert from "node:assert/strict";
import test from "node:test";
import {
  getAlbumPiece,
  layoutStampAlbum,
  STAMP_ALBUM_HEIGHT,
} from "./stamp-album";

const SEEDS = [
  "we-are-artists",
  "pen-or-pencil",
  "writing-software",
  "wealth",
  "caring",
  "hands-on",
  "focus-and-failures",
  "the-fire-inside",
];

test("returns the same album piece for the same seed", () => {
  assert.deepEqual(getAlbumPiece("we-are-artists"), getAlbumPiece("we-are-artists"));
});

test("lays out the same tray the same way", () => {
  assert.deepEqual(
    layoutStampAlbum(SEEDS, 420),
    layoutStampAlbum(SEEDS, 420)
  );
});

test("fills the top row before stacking, and leaves gaps", () => {
  const slots = layoutStampAlbum(SEEDS, 420);
  const row = slots.filter((slot) => !slot.stacked);
  const stacked = slots.filter((slot) => slot.stacked);

  assert.ok(row.length >= 3, "a 420px tray should hold several stamps");
  assert.ok(stacked.length >= 1, "overflow should pile onto the row");
  assert.equal(row.length + stacked.length, SEEDS.length);

  for (let index = 1; index < row.length; index += 1) {
    const previous = row[index - 1];
    const current = row[index];
    const gap = current.x - (previous.x + previous.width);
    assert.ok(gap >= 8, `row stamps should keep a gap, got ${gap}`);
    assert.ok(current.x + current.width <= 420);
  }

  assert.ok(stacked.every((slot) => slot.z > row[row.length - 1].z));
});

test("does not squeeze a stamp into a leftover sliver", () => {
  const first = getAlbumPiece(SEEDS[0]);
  const tight = first.width + 20;
  const slots = layoutStampAlbum(SEEDS.slice(0, 2), tight);

  assert.equal(slots[0].stacked, false);
  assert.equal(slots[1].stacked, true);
});

test("keeps the album band tall enough for a loose pile", () => {
  assert.ok(STAMP_ALBUM_HEIGHT >= 70);
});
