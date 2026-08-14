import { NextResponse } from "next/server";
import {
  isAuthorizedCronRequest,
  runSpotifyExpiryCron,
} from "@/server/spotify-auth";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSpotifyExpiryCron();
  return NextResponse.json(result);
}
