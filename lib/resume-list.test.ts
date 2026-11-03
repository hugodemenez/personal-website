import assert from "node:assert/strict";
import test from "node:test";
import {
  isResumeLoopKey,
  nextResumeIndex,
  previousResumeIndex,
  resumeListItems,
  resumeLoopKeys,
  resumeLoopStepMs,
  RESUME_HOLD_MS,
  RESUME_RESTART_MS,
} from "./resume-list";
import { RESUME_PLACES } from "./resume-places";

test("lists resume beats in carousel order, including EDH", () => {
  const items = resumeListItems();
  assert.deepEqual(
    items.map((item) => item.key),
    RESUME_PLACES.map((place) => place.label)
  );
  assert.deepEqual(items.map((item) => item.key), [
    "France",
    "Portugal",
    "Harvard",
    "Foundever",
    "EDH",
  ]);
  assert.deepEqual(
    items.map((item) => item.title),
    [
      "ISEN",
      "Cofidis",
      "Harvard Business School Online",
      "Foundever",
      "EDH with Rothschild & Co",
    ]
  );
});

test("skips places that have no table name", () => {
  const items = resumeListItems([
    {
      place: "",
      role: "Skip",
      what: "",
      year: "",
      label: "Spain",
      country: "Spain",
      latitude: 40,
      longitude: -3,
      span: "city",
    },
    RESUME_PLACES[0],
  ]);
  assert.deepEqual(
    items.map((item) => item.key),
    ["France"]
  );
});

test("keeps the resume list order regardless of which beat is active", () => {
  const keys = resumeLoopKeys();
  assert.deepEqual(keys, [
    "France",
    "Portugal",
    "Harvard",
    "Foundever",
    "EDH",
  ]);
  assert.ok(isResumeLoopKey("Foundever", keys));
  assert.ok(isResumeLoopKey("France", keys));
  assert.ok(isResumeLoopKey("EDH", keys));
  assert.ok(!isResumeLoopKey("San Francisco", keys));
  assert.ok(!isResumeLoopKey("Canada", keys));
});

test("advances the resume loop one beat at a time and wraps", () => {
  assert.equal(nextResumeIndex(5, -1), 0);
  assert.equal(nextResumeIndex(5, 0), 1);
  assert.equal(nextResumeIndex(5, 1), 2);
  assert.equal(nextResumeIndex(5, 2), 3);
  assert.equal(nextResumeIndex(5, 3), 4);
  assert.equal(nextResumeIndex(5, 4), 0);
  assert.equal(nextResumeIndex(1, 0), 0);
  assert.equal(nextResumeIndex(0, 0), 0);
  assert.equal(resumeLoopStepMs(640), RESUME_RESTART_MS + 640 + RESUME_HOLD_MS);
  assert.ok(resumeLoopStepMs(640) > 640);
});

test("steps the resume loop backward and wraps", () => {
  assert.equal(previousResumeIndex(5, -1), 4);
  assert.equal(previousResumeIndex(5, 0), 4);
  assert.equal(previousResumeIndex(5, 1), 0);
  assert.equal(previousResumeIndex(5, 4), 3);
  assert.equal(previousResumeIndex(1, 0), 0);
  assert.equal(previousResumeIndex(0, 0), 0);
});
