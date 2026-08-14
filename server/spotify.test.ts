import assert from "node:assert/strict";
import test from "node:test";
import { mostListenedTrack, type RecentlyPlayedItem } from "./spotify";
import {
  SpotifyRefreshError,
  evaluateAuthorizeRequest,
  persistSpotifyAuthorization,
  refreshSpotifyAccessToken,
  resolveRefreshToken,
  refreshTokenExpiresAt,
  isRefreshTokenNearExpiry,
  shouldSendExpiryPing,
  shouldStartOAuthFlow,
} from "./spotify-auth";

const now = new Date("2026-08-14T12:00:00.000Z");

function track(
  id: string,
  name: string,
  artist = "Artist"
): NonNullable<RecentlyPlayedItem["track"]> {
  return {
    id,
    name,
    external_urls: { spotify: `https://open.spotify.com/track/${id}` },
    artists: [{ name: artist }],
    album: { images: [{ url: `https://i.scdn.co/image/${id}` }] },
  };
}

function play(
  id: string,
  playedAt: string,
  name = id
): RecentlyPlayedItem {
  return { played_at: playedAt, track: track(id, name) };
}

test("returns null when nothing was played in the window", () => {
  assert.equal(mostListenedTrack([], now), null);
  assert.equal(
    mostListenedTrack(
      [play("old", "2026-08-01T12:00:00.000Z", "Old Song")],
      now
    ),
    null
  );
});

test("picks the track with the most plays in the past seven days", () => {
  const result = mostListenedTrack(
    [
      play("once", "2026-08-14T10:00:00.000Z", "Once"),
      play("repeat", "2026-08-13T10:00:00.000Z", "Repeat"),
      play("repeat", "2026-08-12T10:00:00.000Z", "Repeat"),
      play("repeat", "2026-08-11T10:00:00.000Z", "Repeat"),
      play("old", "2026-08-01T10:00:00.000Z", "Old Song"),
    ],
    now
  );

  assert.deepEqual(result, {
    name: "Repeat",
    artist: "Artist",
    albumArt:
      "/api/image-proxy?url=" +
      encodeURIComponent("https://i.scdn.co/image/repeat"),
    url: "https://open.spotify.com/track/repeat",
  });
});

test("breaks ties toward the more recently played track", () => {
  const result = mostListenedTrack(
    [
      play("older-tie", "2026-08-10T09:00:00.000Z", "Older Tie"),
      play("older-tie", "2026-08-10T08:00:00.000Z", "Older Tie"),
      play("newer-tie", "2026-08-14T09:00:00.000Z", "Newer Tie"),
      play("newer-tie", "2026-08-13T09:00:00.000Z", "Newer Tie"),
    ],
    now
  );

  assert.equal(result?.name, "Newer Tie");
});

test("ignores plays without a track id or a valid timestamp", () => {
  const result = mostListenedTrack(
    [
      { played_at: "2026-08-14T10:00:00.000Z", track: null },
      {
        played_at: "not-a-date",
        track: track("bad-date", "Bad Date"),
      },
      {
        played_at: "2026-08-14T10:00:00.000Z",
        track: { ...track("missing-id", "Missing"), id: undefined },
      },
      play("kept", "2026-08-14T11:00:00.000Z", "Kept"),
    ],
    now
  );

  assert.equal(result?.name, "Kept");
});

const authorizedAt = new Date("2026-08-14T17:43:00.000Z");
const expiresAt = new Date("2027-02-14T17:43:00.000Z");
const warningStartsAt = new Date("2027-01-31T17:43:00.000Z");

test("refresh tokens expire six calendar months after authorization", () => {
  assert.equal(refreshTokenExpiresAt(authorizedAt).toISOString(), expiresAt.toISOString());
  assert.equal(
    refreshTokenExpiresAt(new Date("2026-08-31T12:00:00.000Z")).toISOString(),
    "2027-02-28T12:00:00.000Z"
  );
});

test("the warning window opens 14 days before expiry", () => {
  assert.equal(isRefreshTokenNearExpiry(authorizedAt, new Date("2026-08-14T17:43:00.000Z")), false);
  assert.equal(
    isRefreshTokenNearExpiry(authorizedAt, new Date(warningStartsAt.getTime() - 1)),
    false
  );
  assert.equal(isRefreshTokenNearExpiry(authorizedAt, warningStartsAt), true);
  assert.equal(isRefreshTokenNearExpiry(authorizedAt, expiresAt), true);
  assert.equal(isRefreshTokenNearExpiry(authorizedAt, new Date("2027-03-01T00:00:00.000Z")), true);
});

test("skips OAuth while the refresh token is valid and outside the warning window", () => {
  assert.equal(
    shouldStartOAuthFlow({
      authorizedAt,
      now: new Date("2026-12-01T00:00:00.000Z"),
      hasRefreshToken: true,
      tokenInvalid: false,
    }),
    false
  );
  assert.equal(
    shouldStartOAuthFlow({
      authorizedAt,
      now: warningStartsAt,
      hasRefreshToken: true,
      tokenInvalid: false,
    }),
    true
  );
  assert.equal(
    shouldStartOAuthFlow({
      authorizedAt: null,
      now: new Date("2026-12-01T00:00:00.000Z"),
      hasRefreshToken: true,
      tokenInvalid: false,
    }),
    false
  );
  assert.equal(
    shouldStartOAuthFlow({
      authorizedAt: null,
      now: new Date("2026-12-01T00:00:00.000Z"),
      hasRefreshToken: true,
      tokenInvalid: true,
    }),
    true
  );
});

test("evaluateAuthorizeRequest refuses to rotate a healthy token", async () => {
  const env = {
    SPOTIFY_CLIENT_ID: "id",
    SPOTIFY_CLIENT_SECRET: "secret",
    SPOTIFY_REFRESH_TOKEN: "healthy-token",
    SPOTIFY_AUTHORIZED_AT: authorizedAt.toISOString(),
  };

  assert.deepEqual(
    await evaluateAuthorizeRequest({
      now: new Date("2026-12-01T00:00:00.000Z"),
      env,
      refresh: async () => {
        throw new Error("must not probe a token that is still in date");
      },
    }),
    { action: "still_valid" }
  );

  assert.deepEqual(
    await evaluateAuthorizeRequest({
      now: warningStartsAt,
      env,
    }),
    { action: "start_oauth" }
  );
});

test("unknown authorized_at only starts OAuth after invalid_grant", async () => {
  const env = {
    SPOTIFY_CLIENT_ID: "id",
    SPOTIFY_CLIENT_SECRET: "secret",
    SPOTIFY_REFRESH_TOKEN: "mystery-token",
  };

  assert.deepEqual(
    await evaluateAuthorizeRequest({
      now: new Date("2026-12-01T00:00:00.000Z"),
      env,
      refresh: async () => "access-token",
    }),
    { action: "still_valid" }
  );

  assert.deepEqual(
    await evaluateAuthorizeRequest({
      now: new Date("2026-12-01T00:00:00.000Z"),
      env,
      refresh: async () => {
        throw new SpotifyRefreshError("expired", "invalid_grant");
      },
    }),
    { action: "start_oauth" }
  );
});

test("pings at most once per authorization period", () => {
  const period = authorizedAt.toISOString();
  assert.equal(
    shouldSendExpiryPing({
      authorizedAt,
      now: warningStartsAt,
      tokenInvalid: false,
      pingedFor: null,
    }),
    true
  );
  assert.equal(
    shouldSendExpiryPing({
      authorizedAt,
      now: warningStartsAt,
      tokenInvalid: false,
      pingedFor: period,
    }),
    false
  );
  assert.equal(
    shouldSendExpiryPing({
      authorizedAt: null,
      now: warningStartsAt,
      tokenInvalid: true,
      pingedFor: null,
    }),
    true
  );
  assert.equal(
    shouldSendExpiryPing({
      authorizedAt: null,
      now: warningStartsAt,
      tokenInvalid: true,
      pingedFor: "unknown",
    }),
    false
  );
  assert.equal(
    shouldSendExpiryPing({
      authorizedAt: null,
      now: new Date("2026-12-01T00:00:00.000Z"),
      tokenInvalid: false,
      pingedFor: null,
    }),
    false
  );
});

test("does not retry a refresh token after invalid_grant", async () => {
  const token = `rejected-${Date.now()}`;
  let fetches = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetches += 1;
    return new Response(JSON.stringify({ error: "invalid_grant" }), {
      status: 400,
    });
  };

  try {
    await assert.rejects(
      () => refreshSpotifyAccessToken("id", "secret", token),
      (error: unknown) =>
        error instanceof SpotifyRefreshError && error.code === "invalid_grant"
    );
    await assert.rejects(
      () => refreshSpotifyAccessToken("id", "secret", token),
      (error: unknown) =>
        error instanceof SpotifyRefreshError && error.code === "invalid_grant"
    );
    assert.equal(fetches, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reads the refresh token from the environment", () => {
  assert.equal(resolveRefreshToken({ SPOTIFY_REFRESH_TOKEN: "env-token" }), "env-token");
  assert.equal(resolveRefreshToken({}), null);
});

test("persists authorization through Vercel env writes without exposing the token", async () => {
  const token = "new-refresh-token-secret";
  const written: Record<string, string> = {};
  assert.equal(
    await persistSpotifyAuthorization(token, authorizedAt, {
      persistEnv: async (vars) => {
        Object.assign(written, vars);
        return true;
      },
    }),
    true
  );
  assert.equal(written.SPOTIFY_REFRESH_TOKEN, token);
  assert.equal(written.SPOTIFY_AUTHORIZED_AT, authorizedAt.toISOString());
});
