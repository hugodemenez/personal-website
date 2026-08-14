import assert from "node:assert/strict";
import test from "node:test";
import {
  ALBUM_PILE_VISIBLE,
  albumMountSeeds,
  fadingPresence,
  isStampCollected,
  isTitleStampActive,
  STAMP_FADE_MS,
  TITLE_STAMP_WINDOW,
} from "./stamp-visibility";

test("collects a stamp only after its post has been scrolled past", () => {
  assert.equal(isStampCollected(0, 0), false);
  assert.equal(isStampCollected(0, 1), true);
  assert.equal(isStampCollected(3, 3), false);
  assert.equal(isStampCollected(2, 3), true);
});

test("keeps title stamps for the current post and a short window ahead", () => {
  assert.equal(isTitleStampActive(5, 5), true);
  assert.equal(isTitleStampActive(5 + TITLE_STAMP_WINDOW, 5), true);
  assert.equal(isTitleStampActive(5 + TITLE_STAMP_WINDOW + 1, 5), false);
  assert.equal(isTitleStampActive(4, 5), false);
});

test("keeps the album row and only the top of the pile mounted", () => {
  const slots = [
    { stacked: false },
    { stacked: false },
    { stacked: false },
    ...Array.from({ length: ALBUM_PILE_VISIBLE + 5 }, () => ({ stacked: true })),
  ];
  const seeds = slots.map((_, index) => `s${index}`);
  const mounted = albumMountSeeds(slots, seeds);

  assert.deepEqual(mounted.slice(0, 3), ["s0", "s1", "s2"]);
  assert.equal(mounted.length, 3 + ALBUM_PILE_VISIBLE);
  assert.ok(!mounted.includes("s3"));
  assert.ok(mounted.includes(`s${slots.length - 1}`));
});

test("holds a departing key until the fade elapses, then drops it", () => {
  const active = fadingPresence(new Map(), ["a", "b"], 1000, STAMP_FADE_MS);
  assert.deepEqual([...active.keys()], ["a", "b"]);

  const fading = fadingPresence(active, ["a"], 1000, STAMP_FADE_MS);
  assert.equal(fading.get("b"), 1000 + STAMP_FADE_MS);

  const gone = fadingPresence(fading, ["a"], 1000 + STAMP_FADE_MS, STAMP_FADE_MS);
  assert.equal(gone.has("b"), false);
  assert.equal(gone.get("a"), 0);
});
