import { NextRequest, NextResponse } from "next/server";
import {
  notifySpotifyReauthorization,
  persistSpotifyAuthorization,
} from "@/server/spotify-auth";

const SPOTIFY_OAUTH_STATE_COOKIE = "spotify_oauth_state";

function successResponse() {
  const result = new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Spotify reauthorization</title>
  </head>
  <body>
    <p>Spotify reauthorization succeeded. You can close this page.</p>
  </body>
</html>`,
    {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    }
  );
  result.cookies.delete(SPOTIFY_OAUTH_STATE_COOKIE);
  return result;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get(SPOTIFY_OAUTH_STATE_COOKIE)?.value;

  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json(
      { error: "Missing code parameter", raw_url: request.url },
      { status: 400 }
    );
  }

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI } =
    process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
    return NextResponse.json(
      { error: "Spotify OAuth is not configured" },
      { status: 503 }
    );
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    }),
  });

  const data = (await response.json()) as {
    error?: string;
    error_description?: string;
    refresh_token?: string;
  };

  if (!response.ok || data.error || !data.refresh_token) {
    return NextResponse.json(
      {
        error:
          data.error_description ??
          data.error ??
          "Spotify did not return a refresh token",
      },
      { status: 400 }
    );
  }

  const persisted = await persistSpotifyAuthorization(
    data.refresh_token,
    new Date()
  );
  if (!persisted) {
    return NextResponse.json(
      { error: "Could not persist the new Spotify token. Please try again." },
      { status: 503 }
    );
  }

  await notifySpotifyReauthorization();
  return successResponse();
}
