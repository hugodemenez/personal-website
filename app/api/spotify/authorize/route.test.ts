import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("authorize returns still valid when the stored token is in date", async () => {
  process.env.SPOTIFY_REFRESH_TOKEN = "healthy-token";
  process.env.SPOTIFY_AUTHORIZED_AT = "2026-08-14T17:43:00.000Z";
  process.env.SPOTIFY_CLIENT_ID = "id";
  process.env.SPOTIFY_REDIRECT_URI = "https://www.hugodemenez.fr/api/spotify/callback";

  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "still valid");
  assert.equal(response.headers.get("set-cookie"), null);
});
