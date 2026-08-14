import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/spotify/cron/route";
import {
  SpotifyRefreshError,
  createMemorySpotifyAuthStore,
  isAuthorizedCronRequest,
  runSpotifyExpiryCron,
} from "./spotify-auth";
import { SPOTIFY_AUTHORIZE_URL, SPOTIFY_EXPIRY_TELEGRAM_MESSAGE } from "./telegram";

const authorizedAt = "2026-08-14T17:43:00.000Z";
const warningStartsAt = new Date("2027-01-31T17:43:00.000Z");

function cronRequest(headers: HeadersInit = {}) {
  return new Request("http://localhost/api/spotify/cron", { headers });
}

test("cron requests require a Vercel cron header or CRON_SECRET bearer token", () => {
  const env = { CRON_SECRET: "cron-secret" };
  assert.equal(isAuthorizedCronRequest(cronRequest(), env), false);
  assert.equal(
    isAuthorizedCronRequest(
      cronRequest({ authorization: "Bearer wrong-secret" }),
      env
    ),
    false
  );
  assert.equal(
    isAuthorizedCronRequest(
      cronRequest({ authorization: "Bearer cron-secret" }),
      env
    ),
    true
  );
  assert.equal(
    isAuthorizedCronRequest(cronRequest({ "x-vercel-cron": "1" }), env),
    true
  );
});

test("cron route returns 401 when the request is not from Vercel cron", async () => {
  process.env.CRON_SECRET = "cron-secret";
  const unauthorized = await GET(cronRequest());
  assert.equal(unauthorized.status, 401);
  const wrong = await GET(
    cronRequest({ authorization: "Bearer other-secret" })
  );
  assert.equal(wrong.status, 401);
});

test("healthy tokens outside the warning window are a no-op", async () => {
  const store = createMemorySpotifyAuthStore({
    refreshToken: "healthy-token",
    authorizedAt,
  });
  const messages: string[] = [];

  const result = await runSpotifyExpiryCron({
    now: new Date("2026-12-01T00:00:00.000Z"),
    store,
    env: {
      SPOTIFY_CLIENT_ID: "id",
      SPOTIFY_CLIENT_SECRET: "secret",
    },
    refresh: async () => "access-token",
    sendTelegram: async (text) => {
      messages.push(text);
      return true;
    },
  });

  assert.deepEqual(result, { ok: true, action: "noop" });
  assert.deepEqual(messages, []);
});

test("near expiry sends one Telegram ping keyed by authorized_at", async () => {
  const store = createMemorySpotifyAuthStore({
    refreshToken: "aging-token",
    authorizedAt,
  });
  const messages: string[] = [];
  const env = {
    SPOTIFY_CLIENT_ID: "id",
    SPOTIFY_CLIENT_SECRET: "secret",
  };

  const first = await runSpotifyExpiryCron({
    now: warningStartsAt,
    store,
    env,
    refresh: async () => "access-token",
    sendTelegram: async (text) => {
      messages.push(text);
      return true;
    },
  });
  const second = await runSpotifyExpiryCron({
    now: warningStartsAt,
    store,
    env,
    refresh: async () => {
      throw new Error("already pinged; no need to probe");
    },
    sendTelegram: async (text) => {
      messages.push(text);
      return true;
    },
  });

  assert.deepEqual(first, { ok: true, action: "pinged" });
  assert.deepEqual(second, { ok: true, action: "noop" });
  assert.deepEqual(messages, [SPOTIFY_EXPIRY_TELEGRAM_MESSAGE]);
  assert.match(messages[0], new RegExp(SPOTIFY_AUTHORIZE_URL));
  assert.equal(await store.getExpiryPingedFor(), authorizedAt);
});

test("invalid_grant pings once even when authorized_at is unknown", async () => {
  const store = createMemorySpotifyAuthStore({ refreshToken: "revoked-token" });
  const messages: string[] = [];
  const env = {
    SPOTIFY_CLIENT_ID: "id",
    SPOTIFY_CLIENT_SECRET: "secret",
  };

  const first = await runSpotifyExpiryCron({
    now: new Date("2026-12-01T00:00:00.000Z"),
    store,
    env,
    refresh: async () => {
      throw new SpotifyRefreshError("expired", "invalid_grant");
    },
    sendTelegram: async (text) => {
      messages.push(text);
      return true;
    },
  });
  const second = await runSpotifyExpiryCron({
    now: new Date("2026-12-01T00:00:00.000Z"),
    store,
    env,
    refresh: async () => {
      throw new Error("already pinged");
    },
    sendTelegram: async (text) => {
      messages.push(text);
      return true;
    },
  });

  assert.deepEqual(first, { ok: true, action: "pinged" });
  assert.deepEqual(second, { ok: true, action: "noop" });
  assert.equal(messages.length, 1);
  assert.equal(await store.getExpiryPingedFor(), "unknown");
});
