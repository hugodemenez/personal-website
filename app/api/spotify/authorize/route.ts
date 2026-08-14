import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { evaluateAuthorizeRequest } from "@/server/spotify-auth";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_OAUTH_STATE_COOKIE = "spotify_oauth_state";

export async function GET() {
  const decision = await evaluateAuthorizeRequest();
  if (decision.action === "still_valid") {
    return new NextResponse("still valid", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  if (decision.action === "unavailable") {
    return NextResponse.json(
      { error: "Unable to verify Spotify token" },
      { status: 503 }
    );
  }

  const { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI) {
    return NextResponse.json(
      { error: "Spotify OAuth is not configured" },
      { status: 503 }
    );
  }

  const state = randomBytes(32).toString("base64url");
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: "user-top-read user-library-read user-read-recently-played",
    state,
  });

  const response = NextResponse.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`);
  response.cookies.set(SPOTIFY_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 10 * 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
