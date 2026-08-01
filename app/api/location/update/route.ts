import { NextResponse } from "next/server";
import {
  createEdgeConfigWriteRequest,
  hasValidBearerToken,
  parseLocationUpdate,
} from "@/server/location-data";

export const runtime = "nodejs";

function json(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (
    !hasValidBearerToken(
      request.headers.get("authorization"),
      process.env.LOCATION_UPDATE_SECRET
    )
  ) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4_096) {
    return json({ ok: false, error: "Invalid location payload" }, 400);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid location payload" }, 400);
  }

  const location = parseLocationUpdate(payload);
  if (!location) {
    return json({ ok: false, error: "Invalid location payload" }, 400);
  }

  const writeRequest = createEdgeConfigWriteRequest(location, {
    EDGE_CONFIG_ID: process.env.EDGE_CONFIG_ID,
    EDGE_CONFIG_WRITE_TOKEN: process.env.EDGE_CONFIG_WRITE_TOKEN,
    EDGE_CONFIG_TEAM_ID: process.env.EDGE_CONFIG_TEAM_ID,
  });
  if (!writeRequest) {
    return json({ ok: false, error: "Location storage unavailable" }, 503);
  }

  try {
    const response = await fetch(writeRequest.url, writeRequest.init);
    if (!response.ok) throw new Error("Edge Config write failed");
  } catch {
    console.error("Unable to update the current location in Edge Config");
    return json({ ok: false, error: "Location storage unavailable" }, 503);
  }

  return json(
    {
      ok: true,
      location: { city: location.city, updatedAt: location.updatedAt },
    },
    200
  );
}
