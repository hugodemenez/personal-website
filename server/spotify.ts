"use server";
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

export async function getSpotifyData(): Promise<SpotifyData> {
  "use cache";
  cacheLife("minutes");

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
    return FALLBACK_DATA;
  }

  try {
    // TODO: Implement Spotify API fetch when service is available
    // 1. Refresh access token using SPOTIFY_REFRESH_TOKEN
    // 2. Fetch /me/player/recently-played
    // 3. Fetch /me/top/tracks?limit=5&time_range=medium_term
    // 4. Return formatted SpotifyData
    return FALLBACK_DATA;
  } catch {
    return FALLBACK_DATA;
  }
}
