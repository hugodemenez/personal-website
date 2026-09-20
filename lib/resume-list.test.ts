import assert from "node:assert/strict";
import test from "node:test";
import { orderResumeList, resumeListItems } from "./resume-list";
import { RESUME_PLACES } from "./resume-places";

test("lists resume beats as compact CV lines keyed to map labels", () => {
  const items = resumeListItems();
  assert.deepEqual(
    items.map((item) => item.key),
    RESUME_PLACES.map((place) => place.label)
  );
  assert.deepEqual(
    items.map((item) => item.title),
    [
      "ISEN",
      "Cofidis",
      "Harvard Business School Online",
      "Foundever",
    ]
  );
  assert.ok(items.every((item) => item.detail.length > 0));
});

test("skips places that have no resume detail", () => {
  const items = resumeListItems([
    {
      country: "Spain",
      detail: "",
      label: "Spain",
      latitude: 40,
      longitude: -3,
      span: "city",
      title: "Madrid",
    },
    RESUME_PLACES[0],
  ]);
  assert.deepEqual(
    items.map((item) => item.key),
    ["France"]
  );
});

test("moves the selected resume item to the top and leaves others in place", () => {
  const items = resumeListItems();
  assert.equal(orderResumeList(items, null)[0]?.key, "France");

  const foundeverFirst = orderResumeList(items, "Foundever");
  assert.deepEqual(
    foundeverFirst.map((item) => item.key),
    ["Foundever", "France", "Portugal", "Harvard"]
  );

  const harvardFirst = orderResumeList(items, "Harvard");
  assert.deepEqual(
    harvardFirst.map((item) => item.key),
    ["Harvard", "France", "Portugal", "Foundever"]
  );

  assert.deepEqual(
    orderResumeList(items, "Canada").map((item) => item.key),
    items.map((item) => item.key)
  );
});
