import { createHash } from "node:crypto";
import { cacheLife } from "next/cache";

export interface Track {
  name: string;
  artist: string;
  albumArt: string;
  url: string;
}

export interface SpotifyData {
  recentTrack: Track | null;
  weeklyTopTrack: Track | null;
}

export const WEEKLY_LISTEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const FALLBACK_TRACK: Track = {
  name: "La Vie en Rose",
  artist: "Edith Piaf",
  albumArt:
    "/api/image-proxy?url=" +
    encodeURIComponent("https://i.scdn.co/image/ab67616d00001e023d69a1082b9d676263912178"),
  url: "spotify:track:6RKuyWarJu8SMrflntmyXx",
};

const FALLBACK_DATA: SpotifyData = {
  recentTrack: FALLBACK_TRACK,
  weeklyTopTrack: FALLBACK_TRACK,
};

interface SpotifyTrack {
  id?: string;
  name: string;
  external_urls: { spotify: string };
  artists: { name: string }[];
  album: { images: { url: string }[] };
}

export interface RecentlyPlayedItem {
  played_at: string;
  track?: SpotifyTrack | null;
}

interface SpotifyTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

const rejectedRefreshTokens = new Set<string>();

function tokenFingerprint(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const fingerprint = tokenFingerprint(refreshToken);
  if (rejectedRefreshTokens.has(fingerprint)) {
    throw new Error("Spotify refresh token has expired; reauthorization is required");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${clientId}:${clientSecret}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = (await response.json()) as SpotifyTokenResponse;
  if (!response.ok || !data.access_token) {
    if (data.error === "invalid_grant") {
      // Do not retry an expired token in this process. A changed environment token
      // has a different fingerprint and will be accepted after redeployment.
      rejectedRefreshTokens.add(fingerprint);
    }

    throw new Error(
      data.error === "invalid_grant"
        ? "Spotify refresh token has expired; reauthorization is required"
        : `Spotify token refresh failed (${data.error ?? response.status})`
    );
  }

  return data.access_token;
}

function formatTrack(item: SpotifyTrack): Track {
  return {
    name: item.name,
    artist: item.artists.map((a) => a.name).join(", "),
    albumArt:
      "/api/image-proxy?url=" +
      encodeURIComponent(item.album.images[1]?.url ?? item.album.images[0]?.url),
    url: item.external_urls.spotify,
  };
}

export function mostListenedTrack(
  items: RecentlyPlayedItem[],
  now: Date,
  windowMs = WEEKLY_LISTEN_WINDOW_MS
): Track | null {
  const cutoff = now.getTime() - windowMs;
  const counts = new Map<
    string,
    { count: number; lastPlayed: number; track: SpotifyTrack }
  >();

  for (const item of items) {
    const track = item.track;
    if (!track?.id) continue;

    const playedAt = Date.parse(item.played_at);
    if (Number.isNaN(playedAt) || playedAt < cutoff) continue;

    const existing = counts.get(track.id);
    if (existing) {
      existing.count += 1;
      if (playedAt > existing.lastPlayed) {
        existing.lastPlayed = playedAt;
        existing.track = track;
      }
    } else {
      counts.set(track.id, { count: 1, lastPlayed: playedAt, track });
    }
  }

  let best:
    | { count: number; lastPlayed: number; track: SpotifyTrack }
    | undefined;
  for (const entry of counts.values()) {
    if (
      !best ||
      entry.count > best.count ||
      (entry.count === best.count && entry.lastPlayed > best.lastPlayed)
    ) {
      best = entry;
    }
  }

  return best ? formatTrack(best.track) : null;
}

export async function getSpotifyData(): Promise<SpotifyData> {
  "use cache";
  cacheLife("minutes");

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
    return FALLBACK_DATA;
  }

  try {
    const accessToken = await getAccessToken(
      SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET,
      SPOTIFY_REFRESH_TOKEN
    );
    const headers = { Authorization: `Bearer ${accessToken}` };

    const recentRes = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=50",
      { headers }
    );
    const recentData = (await recentRes.json()) as {
      items?: RecentlyPlayedItem[];
    };
    const items = recentData.items ?? [];

    const recentTrack = items[0]?.track
      ? formatTrack(items[0].track)
      : FALLBACK_TRACK;
    const weeklyTopTrack = mostListenedTrack(items, new Date()) ?? recentTrack;

    return { recentTrack, weeklyTopTrack };
  } catch {
    return FALLBACK_DATA;
  }
}
