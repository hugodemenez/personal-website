import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "./route";

const validPayload = {
  city: "Paris",
  country: "France",
  latitude: 48.8566,
  longitude: 2.3522,
};

function request(payload: unknown, secret = "shortcut-secret") {
  return new Request("http://localhost/api/location/update", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

test("rejects missing and incorrect authorization", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  const missing = await POST(
    new Request("http://localhost/api/location/update", { method: "POST" })
  );
  assert.equal(missing.status, 401);
  assert.equal((await POST(request(validPayload, "wrong"))).status, 401);
});

test("rejects malformed JSON and invalid coordinates", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  const malformed = await POST(
    new Request("http://localhost/api/location/update", {
      method: "POST",
      headers: {
        authorization: "Bearer shortcut-secret",
        "content-type": "application/json",
      },
      body: "{",
    })
  );
  assert.equal(malformed.status, 400);
  assert.equal(
    (await POST(request({ ...validPayload, latitude: 100 }))).status,
    400
  );
});

test("returns 503 when Global Config is unavailable", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  delete process.env.GLOBAL_CONFIG_ID;
  delete process.env.GLOBAL_CONFIG_WRITE_TOKEN;
  assert.equal((await POST(request(validPayload))).status, 503);
});

function mockConfigFetch(options: {
  existing?: unknown;
  readStatus?: number;
  writeStatus?: number;
}) {
  const originalFetch = globalThis.fetch;
  let sentBody: unknown;
  const calls: string[] = [];

  globalThis.fetch = async (input, init) => {
    const method = (init?.method ?? "GET").toUpperCase();
    calls.push(method);
    if (method === "GET") {
      if ((options.readStatus ?? 200) === 404) {
        return new Response(null, { status: 404 });
      }
      return new Response(JSON.stringify(options.existing ?? null), {
        status: options.readStatus ?? 200,
      });
    }

    sentBody = JSON.parse(String(init?.body));
    return new Response(null, { status: options.writeStatus ?? 200 });
  };

  return {
    get sentBody() {
      return sentBody;
    },
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

test("writes the rounded location and starts a one-day history", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  process.env.GLOBAL_CONFIG_ID = "ecfg_test";
  process.env.GLOBAL_CONFIG_WRITE_TOKEN = "write-token";

  const fetchMock = mockConfigFetch({ readStatus: 404 });

  try {
    const response = await POST(request(validPayload));
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      ok: boolean;
      location: { city: string; updatedAt: string };
    };
    assert.equal(body.ok, true);
    assert.equal(body.location.city, "Paris");
    assert.ok(!Number.isNaN(Date.parse(body.location.updatedAt)));
    assert.deepEqual(
      (fetchMock.sentBody as { items: Array<{ value: unknown }> }).items[0].value,
      {
        version: 2,
        city: "Paris",
        country: "France",
        latitude: 48.86,
        longitude: 2.35,
        updatedAt: body.location.updatedAt,
        places: [
          {
            city: "Paris",
            country: "France",
            latitude: 48.86,
            longitude: 2.35,
            days: 1,
            lastSeenAt: body.location.updatedAt,
          },
        ],
      }
    );
  } finally {
    fetchMock.restore();
  }
});

test("accepts coordinates serialized as text by Apple Shortcuts", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  process.env.GLOBAL_CONFIG_ID = "ecfg_test";
  process.env.GLOBAL_CONFIG_WRITE_TOKEN = "write-token";

  const fetchMock = mockConfigFetch({ readStatus: 404 });

  try {
    const response = await POST(
      request({
        city: "Azeitão",
        country: "Portugal",
        latitude: "38,52",
        longitude: "-9.02",
      })
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as { location: { updatedAt: string } };
    assert.deepEqual(
      (fetchMock.sentBody as { items: Array<{ value: unknown }> }).items[0].value,
      {
        version: 2,
        city: "Azeitão",
        country: "Portugal",
        latitude: 38.52,
        longitude: -9.02,
        updatedAt: body.location.updatedAt,
        places: [
          {
            city: "Azeitão",
            country: "Portugal",
            latitude: 38.52,
            longitude: -9.02,
            days: 1,
            lastSeenAt: body.location.updatedAt,
          },
        ],
      }
    );
  } finally {
    fetchMock.restore();
  }
});

test("increments days for a returning place and keeps earlier stays", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  process.env.GLOBAL_CONFIG_ID = "ecfg_test";
  process.env.GLOBAL_CONFIG_WRITE_TOKEN = "write-token";

  const fetchMock = mockConfigFetch({
    existing: {
      version: 2,
      city: "Lisbon",
      country: "Portugal",
      latitude: 38.72,
      longitude: -9.14,
      updatedAt: "2026-07-20T08:00:00.000Z",
      places: [
        {
          city: "Lisbon",
          country: "Portugal",
          latitude: 38.72,
          longitude: -9.14,
          days: 9,
          lastSeenAt: "2026-07-20T08:00:00.000Z",
        },
        {
          city: "Paris",
          country: "France",
          latitude: 48.86,
          longitude: 2.35,
          days: 3,
          lastSeenAt: "2026-06-01T08:00:00.000Z",
        },
      ],
    },
  });

  try {
    const response = await POST(request(validPayload));
    assert.equal(response.status, 200);
    const stored = (
      fetchMock.sentBody as {
        items: Array<{
          value: {
            city: string;
            places: Array<{ city: string; days: number }>;
          };
        }>;
      }
    ).items[0].value;
    assert.equal(stored.city, "Paris");
    assert.equal(stored.places.length, 2);
    assert.equal(stored.places[0].city, "Paris");
    assert.equal(stored.places[0].days, 4);
    assert.equal(stored.places[1].city, "Lisbon");
    assert.equal(stored.places[1].days, 9);
  } finally {
    fetchMock.restore();
  }
});

test("returns 503 when the stored location cannot be read", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  process.env.GLOBAL_CONFIG_ID = "ecfg_test";
  process.env.GLOBAL_CONFIG_WRITE_TOKEN = "write-token";

  const fetchMock = mockConfigFetch({ readStatus: 500 });

  try {
    assert.equal((await POST(request(validPayload))).status, 503);
    assert.deepEqual(fetchMock.calls, ["GET"]);
  } finally {
    fetchMock.restore();
  }
});

test("rejects coordinates without decimal precision", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  process.env.GLOBAL_CONFIG_ID = "ecfg_test";
  process.env.GLOBAL_CONFIG_WRITE_TOKEN = "write-token";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Unvalidated coordinates must not reach storage");
  };

  try {
    const numericResponse = await POST(
      request({ city: "Lisboa", latitude: 38, longitude: -9 })
    );
    assert.equal(numericResponse.status, 400);
    assert.deepEqual(await numericResponse.json(), {
      ok: false,
      error: "Coordinates must include decimal precision",
    });

    const textResponse = await POST(
      request({ city: "Lisboa", latitude: "38", longitude: "-9" })
    );
    assert.equal(textResponse.status, 400);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns 503 when the Global Config write fails", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  process.env.GLOBAL_CONFIG_ID = "ecfg_test";
  process.env.GLOBAL_CONFIG_WRITE_TOKEN = "write-token";
  const fetchMock = mockConfigFetch({ readStatus: 404, writeStatus: 500 });

  try {
    assert.equal((await POST(request(validPayload))).status, 503);
  } finally {
    fetchMock.restore();
  }
});
