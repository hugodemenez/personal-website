import assert from "node:assert/strict";
import test from "node:test";
import { mostListenedTrack, type RecentlyPlayedItem } from "./spotify";

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
