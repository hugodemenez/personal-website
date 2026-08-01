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

test("returns 503 when Edge Config is unavailable", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  delete process.env.EDGE_CONFIG_ID;
  delete process.env.EDGE_CONFIG_WRITE_TOKEN;
  assert.equal((await POST(request(validPayload))).status, 503);
});

test("writes the rounded location and returns its public summary", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  process.env.EDGE_CONFIG_ID = "ecfg_test";
  process.env.EDGE_CONFIG_WRITE_TOKEN = "write-token";

  const originalFetch = globalThis.fetch;
  let sentBody: unknown;
  globalThis.fetch = async (_input, init) => {
    sentBody = JSON.parse(String(init?.body));
    return new Response(null, { status: 200 });
  };

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
      (sentBody as { items: Array<{ value: { latitude: number; longitude: number } }> })
        .items[0].value,
      {
        version: 1,
        city: "Paris",
        country: "France",
        latitude: 48.86,
        longitude: 2.35,
        updatedAt: body.location.updatedAt,
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns 503 when the Edge Config write fails", async () => {
  process.env.LOCATION_UPDATE_SECRET = "shortcut-secret";
  process.env.EDGE_CONFIG_ID = "ecfg_test";
  process.env.EDGE_CONFIG_WRITE_TOKEN = "write-token";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 500 });

  try {
    assert.equal((await POST(request(validPayload))).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
