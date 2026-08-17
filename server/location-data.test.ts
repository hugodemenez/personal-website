import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLocationVisit,
  createGlobalConfigReadRequest,
  createGlobalConfigWriteRequest,
  hasValidBearerToken,
  parseLocationUpdate,
  parseStoredLocation,
  parseStoredLocationResponse,
  samePlace,
  sameUtcCalendarDay,
  toVisitedPlaces,
} from "./location-data";

const now = new Date("2026-08-01T08:00:00.000Z");

test("validates, normalizes, and rounds a location update", () => {
  assert.deepEqual(
    parseLocationUpdate(
      {
        country: " United States ",
        latitude: 40.7128,
        longitude: -74.006,
      },
      now
    ),
    {
      version: 1,
      country: "United States",
      latitude: 40.71,
      longitude: -74.01,
      updatedAt: now.toISOString(),
    }
  );
});

test("ignores a locality field still sent by older Shortcuts", () => {
  assert.deepEqual(
    parseLocationUpdate(
      {
        city: "Locality",
        country: "Portugal",
        latitude: "38,52",
        longitude: "-9.02",
      },
      now
    ),
    {
      version: 1,
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
      { country: "x".repeat(81), latitude: 1, longitude: 2 },
      now
    ),
    null
  );
  assert.equal(
    parseLocationUpdate({ country: "Portugal", latitude: 91, longitude: 2 }, now),
    null
  );
  assert.equal(
    parseLocationUpdate({ country: "Portugal", latitude: 1, longitude: -181 }, now),
    null
  );
  assert.equal(
    parseLocationUpdate(
      { country: "Portugal", latitude: "38.72 north", longitude: "-9.14" },
      now
    ),
    null
  );
  assert.equal(
    parseLocationUpdate({ latitude: 38.72, longitude: -9.14 }, now),
    null
  );
});

test("rejects malformed stored records and upgrades version 1", () => {
  assert.equal(parseStoredLocation({ version: 4 }), null);
  assert.equal(
    parseStoredLocation({
      version: 1,
      country: "France",
      latitude: 48.86,
      longitude: 2.35,
      updatedAt: "not-a-date",
    }),
    null
  );

  assert.deepEqual(
    parseStoredLocation({
      version: 1,
      country: "France",
      latitude: 48.86,
      longitude: 2.35,
      updatedAt: now.toISOString(),
    }),
    {
      version: 3,
      country: "France",
      latitude: 48.86,
      longitude: 2.35,
      updatedAt: now.toISOString(),
      places: [
        {
          country: "France",
          latitude: 48.86,
          longitude: 2.35,
          days: 1,
          lastSeenAt: now.toISOString(),
        },
      ],
    }
  );
});

test("parses a version 3 record and unwraps a Global Config item response", () => {
  const stored = {
    version: 3 as const,
    country: "Portugal",
    latitude: 38.72,
    longitude: -9.14,
    updatedAt: now.toISOString(),
    places: [
      {
        country: "Portugal",
        latitude: 38.72,
        longitude: -9.14,
        days: 12,
        lastSeenAt: now.toISOString(),
      },
      {
        country: "France",
        latitude: 48.86,
        longitude: 2.35,
        days: 3,
        lastSeenAt: "2026-07-20T08:00:00.000Z",
      },
    ],
  };

  assert.deepEqual(parseStoredLocation(stored), stored);
  assert.deepEqual(parseStoredLocationResponse({ value: stored }), stored);
});

test("drops locality names when reading an older stored record", () => {
  assert.deepEqual(
    parseStoredLocation({
      version: 2,
      city: "Locality",
      country: "France",
      latitude: 48.86,
      longitude: 2.35,
      updatedAt: now.toISOString(),
      places: [
        {
          city: "Locality",
          country: "France",
          latitude: 48.86,
          longitude: 2.35,
          days: 3,
          lastSeenAt: now.toISOString(),
        },
        {
          city: "Other locality",
          country: "France",
          latitude: 50.63,
          longitude: 3.06,
          days: 2,
          lastSeenAt: "2026-07-20T08:00:00.000Z",
        },
        {
          city: "Home locality",
          country: "Portugal",
          latitude: 38.72,
          longitude: -9.14,
          days: 12,
          lastSeenAt: "2026-07-01T08:00:00.000Z",
        },
      ],
    }),
    {
      version: 3,
      country: "France",
      latitude: 48.86,
      longitude: 2.35,
      updatedAt: now.toISOString(),
      places: [
        {
          country: "France",
          latitude: 48.86,
          longitude: 2.35,
          days: 3,
          lastSeenAt: now.toISOString(),
        },
        {
          country: "Portugal",
          latitude: 38.72,
          longitude: -9.14,
          days: 12,
          lastSeenAt: "2026-07-01T08:00:00.000Z",
        },
      ],
    }
  );
});

test("starts a history from the first visit and increments once per UTC day", () => {
  const first = parseLocationUpdate(
    { country: "France", latitude: 48.8566, longitude: 2.3522 },
    now
  );
  assert.ok(first);

  const started = applyLocationVisit(null, first);
  assert.equal(started.places.length, 1);
  assert.equal(started.places[0].days, 1);

  const sameDay = applyLocationVisit(
    started,
    parseLocationUpdate(
      { country: "France", latitude: 48.86, longitude: 2.35 },
      new Date("2026-08-01T21:00:00.000Z")
    )!
  );
  assert.equal(sameDay.places[0].days, 1);

  const nextDay = applyLocationVisit(
    sameDay,
    parseLocationUpdate(
      { country: "France", latitude: 48.86, longitude: 2.35 },
      new Date("2026-08-02T08:00:00.000Z")
    )!
  );
  assert.equal(nextDay.places[0].days, 2);
  assert.equal(nextDay.country, "France");
});

test("adds a new country without dropping earlier stays", () => {
  const france = applyLocationVisit(
    null,
    parseLocationUpdate(
      { country: "France", latitude: 48.86, longitude: 2.35 },
      now
    )!
  );
  const portugal = applyLocationVisit(
    france,
    parseLocationUpdate(
      { country: "Portugal", latitude: 38.72, longitude: -9.14 },
      new Date("2026-08-03T08:00:00.000Z")
    )!
  );

  assert.equal(portugal.country, "Portugal");
  assert.equal(portugal.places.length, 2);
  assert.equal(portugal.places[0].country, "Portugal");
  assert.equal(portugal.places[0].days, 1);
  assert.equal(portugal.places[1].country, "France");
  assert.equal(portugal.places[1].days, 1);
});

test("merges later coordinates in the same country into one stay", () => {
  const first = applyLocationVisit(
    null,
    parseLocationUpdate(
      { country: "France", latitude: 48.86, longitude: 2.35 },
      now
    )!
  );
  const sameCountry = applyLocationVisit(
    first,
    parseLocationUpdate(
      { country: "France", latitude: 50.63, longitude: 3.06 },
      new Date("2026-08-04T08:00:00.000Z")
    )!
  );

  assert.equal(sameCountry.places.length, 1);
  assert.equal(sameCountry.country, "France");
  assert.equal(sameCountry.latitude, 50.63);
  assert.equal(sameCountry.places[0].days, 2);
});

test("keeps at most three distinct countries in Global Config", () => {
  const first = applyLocationVisit(
    null,
    parseLocationUpdate(
      { country: "France", latitude: 48.86, longitude: 2.35 },
      now
    )!
  );
  const second = applyLocationVisit(
    first,
    parseLocationUpdate(
      { country: "Portugal", latitude: 38.72, longitude: -9.14 },
      new Date("2026-08-03T08:00:00.000Z")
    )!
  );
  const third = applyLocationVisit(
    second,
    parseLocationUpdate(
      { country: "Spain", latitude: 40.42, longitude: -3.7 },
      new Date("2026-08-04T08:00:00.000Z")
    )!
  );
  const fourth = applyLocationVisit(
    third,
    parseLocationUpdate(
      { country: "Germany", latitude: 52.52, longitude: 13.4 },
      new Date("2026-08-05T08:00:00.000Z")
    )!
  );

  assert.equal(fourth.country, "Germany");
  assert.equal(fourth.places.length, 3);
  assert.deepEqual(
    fourth.places.map((place) => place.country),
    ["Germany", "Spain", "Portugal"]
  );
});

test("matches places by normalized country", () => {
  assert.equal(
    samePlace({ country: "United States" }, { country: "united states" }),
    true
  );
  assert.equal(
    samePlace({ country: "France" }, { country: "United States" }),
    false
  );
  assert.equal(sameUtcCalendarDay("2026-08-01T08:00:00.000Z", "2026-08-01T23:00:00.000Z"), true);
  assert.equal(sameUtcCalendarDay("2026-08-01T08:00:00.000Z", "2026-08-02T00:00:00.000Z"), false);
});

test("exposes regional public places and a Portugal home-base fallback", () => {
  const home = toVisitedPlaces(null);
  assert.equal(home.length, 1);
  assert.equal(home[0].country, "Portugal");
  assert.equal(home[0].days, null);
  assert.equal(home[0].isHomeBase, true);

  const visited = toVisitedPlaces({
    version: 3,
    country: "France",
    latitude: 48.86,
    longitude: 2.35,
    updatedAt: now.toISOString(),
    places: [
      {
        country: "France",
        latitude: 48.86,
        longitude: 2.35,
        days: 3,
        lastSeenAt: now.toISOString(),
      },
      {
        country: "Portugal",
        latitude: 38.72,
        longitude: -9.14,
        days: 12,
        lastSeenAt: "2026-07-01T08:00:00.000Z",
      },
    ],
  });

  assert.equal(visited[0].country, "France");
  assert.equal(visited[0].isCurrent, true);
  assert.equal(visited[1].country, "Portugal");
  assert.equal(visited[1].days, 12);
  assert.ok(Math.abs(visited[0].latitude - 49) < 1);
  assert.ok(Math.abs(visited[0].longitude - 2) < 1);
});

test("checks bearer tokens and produces authenticated read and write requests", () => {
  assert.equal(hasValidBearerToken("Bearer shortcut-secret", "shortcut-secret"), true);
  assert.equal(hasValidBearerToken("Bearer wrong", "shortcut-secret"), false);
  assert.equal(hasValidBearerToken(null, "shortcut-secret"), false);

  const location = applyLocationVisit(
    null,
    parseLocationUpdate(
      { country: "France", latitude: 48.8566, longitude: 2.3522 },
      now
    )!
  );
  const environment = {
    GLOBAL_CONFIG_ID: "ecfg_test",
    GLOBAL_CONFIG_WRITE_TOKEN: "write-token",
    GLOBAL_CONFIG_TEAM_ID: "team_test",
  };

  const read = createGlobalConfigReadRequest(environment);
  assert.ok(read);
  assert.equal(
    read.url,
    "https://api.vercel.com/v1/edge-config/ecfg_test/item/current_location?teamId=team_test"
  );
  assert.equal(read.init.method, "GET");

  const request = createGlobalConfigWriteRequest(location, environment);
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
