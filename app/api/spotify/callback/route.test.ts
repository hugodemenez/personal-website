import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "./route";

const oauthState = "csrf-state";
const leakedToken = "super-secret-refresh-token";

function callbackRequest(query: string) {
  return new NextRequest(`http://localhost/api/spotify/callback?${query}`, {
    headers: { cookie: `spotify_oauth_state=${oauthState}` },
  });
}

test("callback rejects invalid OAuth state", async () => {
  const response = await GET(callbackRequest("code=abc&state=wrong"));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid OAuth state" });
});

test("callback success and storage errors never echo the refresh token", async () => {
  process.env.SPOTIFY_CLIENT_ID = "id";
  process.env.SPOTIFY_CLIENT_SECRET = "secret";
  process.env.SPOTIFY_REDIRECT_URI = "https://www.hugodemenez.fr/api/spotify/callback";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ refresh_token: leakedToken }), { status: 200 });

  try {
    const response = await GET(
      callbackRequest(`code=auth-code&state=${oauthState}`)
    );
    const body = await response.text();
    assert.equal(response.status, 503);
    assert.doesNotMatch(body, /super-secret-refresh-token/);
    assert.doesNotMatch(body, /refresh_token/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
