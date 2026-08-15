import assert from "node:assert/strict";
import test from "node:test";
import {
  formatLocalTime,
  isLocationStale,
  locationWeatherChanged,
  locationWeatherSignature,
} from "./location-display";

const now = new Date("2026-08-01T08:00:00.000Z");

test("marks a location stale only after seven days", () => {
  assert.equal(isLocationStale("2026-07-25T08:00:00.000Z", now), false);
  assert.equal(isLocationStale("2026-07-25T07:59:59.999Z", now), true);
  assert.equal(isLocationStale(null, now), false);
});

test("treats city, temperature, and condition as the visible weather identity", () => {
  const lisbon = {
    location: "Lisbon",
    temperature: 18,
    condition: "Clear",
  };

  assert.equal(locationWeatherSignature(lisbon), "Lisbon|18|Clear");
  assert.equal(locationWeatherChanged(lisbon, { ...lisbon }), false);
  assert.equal(
    locationWeatherChanged(lisbon, { ...lisbon, temperature: 19 }),
    true
  );
  assert.equal(
    locationWeatherChanged(lisbon, { ...lisbon, location: "Paris" }),
    true
  );
  assert.equal(locationWeatherChanged(null, lisbon), true);
  assert.equal(locationWeatherSignature(null), "");
});

test("formats clocks in the weather service timezone", () => {
  assert.equal(formatLocalTime("Europe/Lisbon", now), "9:00 AM");
  assert.equal(formatLocalTime("America/New_York", now), "4:00 AM");
  assert.equal(formatLocalTime("not/a-timezone", now), null);
  assert.equal(formatLocalTime(null, now), null);
});
