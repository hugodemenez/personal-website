import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

function hashImage(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const imageUrl = request.nextUrl.searchParams.get("imageUrl");

  if (!slug || !imageUrl) {
    return NextResponse.json(
      { error: "Missing slug or imageUrl" },
      { status: 400 }
    );
  }

  try {
    const parsed = new URL(imageUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Invalid imageUrl" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid imageUrl" }, { status: 400 });
  }

  const imageHash = hashImage(imageUrl);
  const cacheKey = `${slug}:${imageHash}`;
  const proxiedPreview = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;

  // Placeholder response; wire to Modal + storage in a follow-up iteration.
  return NextResponse.json(
    {
      status: "pending",
      previewImageUrl: proxiedPreview,
      cacheKey,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
