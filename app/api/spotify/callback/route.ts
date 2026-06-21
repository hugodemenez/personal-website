import { NextRequest, NextResponse } from "next/server";

const SPOTIFY_OAUTH_STATE_COOKIE = "spotify_oauth_state";

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

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI } = process.env;
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
      { error: data.error_description ?? data.error ?? "Spotify did not return a refresh token" },
      { status: 400 }
    );
  }

  const result = NextResponse.json({
    message: "Copy this refresh_token to your .env file as SPOTIFY_REFRESH_TOKEN",
    refresh_token: data.refresh_token,
  });
  result.cookies.delete(SPOTIFY_OAUTH_STATE_COOKIE);
  return result;
}
