"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type SceneStatus = "pending" | "ready" | "error";

interface HeroSharpViewerProps {
  readonly slug: string;
  readonly heroImageUrl: string;
  readonly originalImageUrl?: string;
}

interface SceneResponse {
  status: SceneStatus;
  plyUrl?: string;
  previewImageUrl?: string;
}

export function HeroSharpViewer({
  slug,
  heroImageUrl,
  originalImageUrl,
}: HeroSharpViewerProps) {
  const [scene, setScene] = useState<SceneResponse>({ status: "pending" });

  useEffect(() => {
    let isMounted = true;
    const loadScene = async () => {
      try {
        const params = new URLSearchParams({
          slug,
          imageUrl: originalImageUrl ?? heroImageUrl,
        });
        const res = await fetch(`/api/sharp-scene?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Request failed");
        const data = (await res.json()) as SceneResponse;
        if (isMounted) {
          setScene(data);
        }
      } catch (error) {
        console.error("Failed to fetch SHARP scene", error);
        if (isMounted) {
          setScene({ status: "error" });
        }
      }
    };
    loadScene();
    return () => {
      isMounted = false;
    };
  }, [heroImageUrl, originalImageUrl, slug]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface">
      <Image
        src={heroImageUrl}
        alt="Post hero"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/60" />
      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground shadow">
        <span className="h-2 w-2 rounded-full bg-accent" />
        {scene.status === "ready"
          ? "3D scene ready"
          : scene.status === "pending"
          ? "Generating 3D view"
          : "Scene unavailable"}
      </div>
    </div>
  );
}
