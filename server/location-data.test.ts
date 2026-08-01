import assert from "node:assert/strict";
import test from "node:test";
import {
  createGlobalConfigWriteRequest,
  hasValidBearerToken,
  parseLocationUpdate,
  parseStoredLocation,
} from "./location-data";

const now = new Date("2026-08-01T08:00:00.000Z");

test("validates, normalizes, and rounds a location update", () => {
  assert.deepEqual(
    parseLocationUpdate(
      {
        city: "  New   York  ",
        country: " United States ",
        latitude: 40.7128,
        longitude: -74.006,
      },
      now
    ),
    {
      version: 1,
      city: "New York",
      country: "United States",
      latitude: 40.71,
      longitude: -74.01,
      updatedAt: now.toISOString(),
    }
  );
});

test("accepts decimal coordinates serialized as text by Apple Shortcuts", () => {
  assert.deepEqual(
    parseLocationUpdate(
      {
        city: "Azeitão",
        country: "Portugal",
        latitude: "38,52",
        longitude: "-9.02",
      },
      now
    ),
    {
      version: 1,
      city: "Azeitão",
      country: "Portugal",
      latitude: 38.52,
      longitude: -9.02,
      updatedAt: now.toISOString(),
    }
  );
});

test("rejects malformed locations and oversized names", () => {
  assert.equal(parseLocationUpdate(null, now), null);
  assert.equal(
    parseLocationUpdate(
      { city: "x".repeat(81), latitude: 1, longitude: 2 },
      now
    ),
    null
  );
  assert.equal(
    parseLocationUpdate({ city: "Lisbon", latitude: 91, longitude: 2 }, now),
    null
  );
  assert.equal(
    parseLocationUpdate({ city: "Lisbon", latitude: 1, longitude: -181 }, now),
    null
  );
  assert.equal(
    parseLocationUpdate(
      { city: "Lisbon", latitude: "38.72 north", longitude: "-9.14" },
      now
    ),
    null
  );
});

test("rejects malformed stored records", () => {
  assert.equal(parseStoredLocation({ version: 2 }), null);
  assert.equal(
    parseStoredLocation({
      version: 1,
      city: "Paris",
      latitude: 48.86,
      longitude: 2.35,
      updatedAt: "not-a-date",
    }),
    null
  );
});

test("checks bearer tokens and produces the authenticated batch upsert", () => {
  assert.equal(hasValidBearerToken("Bearer shortcut-secret", "shortcut-secret"), true);
  assert.equal(hasValidBearerToken("Bearer wrong", "shortcut-secret"), false);
  assert.equal(hasValidBearerToken(null, "shortcut-secret"), false);

  const location = parseLocationUpdate(
    { city: "Paris", latitude: 48.8566, longitude: 2.3522 },
    now
  );
  assert.ok(location);
  const request = createGlobalConfigWriteRequest(location, {
    GLOBAL_CONFIG_ID: "ecfg_test",
    GLOBAL_CONFIG_WRITE_TOKEN: "write-token",
    GLOBAL_CONFIG_TEAM_ID: "team_test",
  });
  assert.ok(request);
  assert.equal(
    request.url,
    "https://api.vercel.com/v1/edge-config/ecfg_test/items?teamId=team_test"
  );
  assert.equal(request.init.method, "PATCH");
  assert.equal(
    (request.init.headers as Record<string, string>).authorization,
    "Bearer write-token"
  );
  assert.deepEqual(JSON.parse(String(request.init.body)), {
    items: [
      {
        operation: "upsert",
        key: "current_location",
        value: location,
      },
    ],
  });
});
