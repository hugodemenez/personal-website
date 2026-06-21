"use server";
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
  topTracks: Track[];
}

const FALLBACK_DATA: SpotifyData = {
  recentTrack: {
    name: "La Vie en Rose",
    artist: "Edith Piaf",
    albumArt: "/api/image-proxy?url=" + encodeURIComponent("https://i.scdn.co/image/ab67616d00001e023d69a1082b9d676263912178"),
    url: "spotify:track:6RKuyWarJu8SMrflntmyXx",
  },
  topTracks: [],
};

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

function formatTrack(item: {
  name: string;
  external_urls: { spotify: string };
  artists: { name: string }[];
  album: { images: { url: string }[] };
}): Track {
  return {
    name: item.name,
    artist: item.artists.map((a) => a.name).join(", "),
    albumArt:
      "/api/image-proxy?url=" +
      encodeURIComponent(item.album.images[1]?.url ?? item.album.images[0]?.url),
    url: item.external_urls.spotify,
  };
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

    const [recentRes, topRes] = await Promise.all([
      fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", { headers }),
      fetch("https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=medium_term", { headers }),
    ]);

    const recentData = await recentRes.json();
    const topData = await topRes.json();

    const recentTrack = recentData.items?.[0]?.track
      ? formatTrack(recentData.items[0].track)
      : FALLBACK_DATA.recentTrack;

    const topTracks = topData.items?.map(formatTrack) ?? [];

    return { recentTrack, topTracks };
  } catch {
    return FALLBACK_DATA;
  }
}
