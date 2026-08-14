import assert from "node:assert/strict";
import test from "node:test";
import { getStampPose } from "./stamp-pose";

test("returns the same pose for the same seed", () => {
  assert.deepEqual(
    getStampPose("we-are-artists"),
    getStampPose("we-are-artists")
  );
});

test("different posts land in different places", () => {
  const first = getStampPose("we-are-artists");
  const second = getStampPose("pen-or-pencil");

  assert.notDeepEqual(first, second);
});

test("keeps collectible stamps inside a readable range", () => {
  const pose = getStampPose("writing-software");

  assert.ok(["start", "center", "end"].includes(pose.align));
  assert.ok(pose.rotate >= -7 && pose.rotate <= 7);
  assert.ok(pose.shiftX >= -9 && pose.shiftX <= 9);
  assert.ok(pose.shiftY >= -5 && pose.shiftY <= 5);
  assert.ok(pose.width >= 0.72 && pose.width <= 0.88);
  assert.ok(pose.pitch >= 11 && pose.pitch <= 13.4);
});

test("feature stamps stay larger and tilt less", () => {
  const pose = getStampPose("we-are-artists", "feature");

  assert.ok(Math.abs(pose.rotate) <= 4);
  assert.ok(pose.width >= 0.9 && pose.width <= 0.98);
});
