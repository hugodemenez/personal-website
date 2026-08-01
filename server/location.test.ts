import assert from "node:assert/strict";
import test from "node:test";
import { composeLocationWeather } from "./location";
import type { StoredLocation } from "./location-data";

const paris: StoredLocation = {
  version: 1,
  city: "Paris",
  country: "France",
  latitude: 48.86,
  longitude: 2.35,
  updatedAt: "2026-08-01T08:00:00.000Z",
};

test("uses Lisbon as the home base when Edge Config has no valid record", () => {
  assert.deepEqual(composeLocationWeather(null, null), {
    location: "Lisbon",
    country: "Portugal",
    timeZone: "Europe/Lisbon",
    temperature: null,
    condition: null,
    updatedAt: null,
    isHomeBase: true,
  });
});

test("preserves a saved location during an independent weather outage", () => {
  assert.deepEqual(composeLocationWeather(paris, null), {
    location: "Paris",
    country: "France",
    timeZone: null,
    temperature: null,
    condition: null,
    updatedAt: paris.updatedAt,
    isHomeBase: false,
  });
});

test("combines the saved location with timezone-aware current weather", () => {
  assert.deepEqual(
    composeLocationWeather(paris, {
      timeZone: "Europe/Paris",
      temperature: 26,
      condition: "Clear",
    }),
    {
      location: "Paris",
      country: "France",
      timeZone: "Europe/Paris",
      temperature: 26,
      condition: "Clear",
      updatedAt: paris.updatedAt,
      isHomeBase: false,
    }
  );
});
