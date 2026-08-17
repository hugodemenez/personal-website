import assert from "node:assert/strict";
import test from "node:test";
import { composeLocationWeather } from "./location";
import type { StoredLocation } from "./location-data";

const france: StoredLocation = {
  version: 3,
  country: "France",
  latitude: 48.86,
  longitude: 2.35,
  updatedAt: "2026-08-01T08:00:00.000Z",
  places: [
    {
      country: "France",
      latitude: 48.86,
      longitude: 2.35,
      days: 4,
      lastSeenAt: "2026-08-01T08:00:00.000Z",
    },
  ],
};

test("uses Portugal as the home base when Global Config has no valid record", () => {
  assert.deepEqual(composeLocationWeather(null, null), {
    location: "Portugal",
    country: "Portugal",
    timeZone: "Europe/Lisbon",
    temperature: null,
    condition: null,
    updatedAt: null,
    isHomeBase: true,
  });
});

test("preserves a saved location during an independent weather outage", () => {
  assert.deepEqual(composeLocationWeather(france, null), {
    location: "France",
    country: "France",
    timeZone: null,
    temperature: null,
    condition: null,
    updatedAt: france.updatedAt,
    isHomeBase: false,
  });
});

test("combines the saved location with timezone-aware current weather", () => {
  assert.deepEqual(
    composeLocationWeather(france, {
      timeZone: "Europe/Paris",
      temperature: 26,
      condition: "Clear",
    }),
    {
      location: "France",
      country: "France",
      timeZone: "Europe/Paris",
      temperature: 26,
      condition: "Clear",
      updatedAt: france.updatedAt,
      isHomeBase: false,
    }
  );
});
