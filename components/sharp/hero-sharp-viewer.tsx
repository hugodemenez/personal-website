"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { SharpSceneViewer } from "@/components/sharp/sharp-scene-viewer";

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
  cacheKey?: string;
  demo?: boolean;
}

const POLL_INTERVAL_MS = 6000;

export function HeroSharpViewer({
  slug,
  heroImageUrl,
  originalImageUrl,
}: HeroSharpViewerProps) {
  const [scene, setScene] = useState<SceneResponse>({ status: "pending" });
  const [resetSignal, setResetSignal] = useState(0);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [motionMessage, setMotionMessage] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const demoMode = useMemo(
    () => process.env.NEXT_PUBLIC_SHARP_DEMO === "1",
    []
  );

  useEffect(() => {
    setMotionEnabled(false);
    setMotionMessage(null);
    setResetSignal((value) => value + 1);
  }, [slug]);

  useEffect(() => {
    const handleScroll = (event: Event) => {
      const custom = event as CustomEvent<{ progress?: number }>;
      if (typeof custom.detail?.progress !== "number") return;
      const centered = custom.detail.progress - 0.5;
      setScrollOffset(centered);
    };
    window.addEventListener("post-drawer-scroll", handleScroll as EventListener);
    return () => {
      window.removeEventListener("post-drawer-scroll", handleScroll as EventListener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loadScene = async () => {
      try {
        const params = new URLSearchParams({
          slug,
          imageUrl: originalImageUrl ?? heroImageUrl,
        });
        if (demoMode) {
          params.set("demo", "1");
        }
        const res = await fetch(`/api/sharp-scene?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Request failed");
        const data = (await res.json()) as SceneResponse;
        if (cancelled) return;
        setScene(data);
        if (data.status === "pending") {
          timer = setTimeout(loadScene, POLL_INTERVAL_MS);
        }
      } catch (error) {
        console.error("Failed to fetch SHARP scene", error);
        if (!cancelled) {
          setScene({ status: "error" });
        }
      }
    };

    setScene({ status: "pending" });
    loadScene();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [demoMode, heroImageUrl, originalImageUrl, slug]);

  const requestMotion = async () => {
    if (prefersReducedMotion) {
      setMotionMessage("Motion is disabled by prefers-reduced-motion.");
      return;
    }
    setMotionMessage(null);
    if (typeof window === "undefined") return;
    const DeviceOrientation = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
      | undefined;

    if (DeviceOrientation?.requestPermission) {
      try {
        const result = await DeviceOrientation.requestPermission();
        if (result === "granted") {
          setMotionEnabled(true);
        } else {
          setMotionMessage("Motion permission denied.");
        }
      } catch {
        setMotionMessage("Motion request failed.");
      }
      return;
    }

    if (typeof DeviceOrientationEvent !== "undefined") {
      setMotionEnabled(true);
    } else {
      setMotionMessage("Motion not supported on this device.");
    }
  };

  const resetView = () => {
    setResetSignal((value) => value + 1);
  };

  const badgeText =
    scene.status === "ready"
      ? scene.demo
        ? "3D demo scene ready"
        : "3D scene ready"
      : scene.status === "pending"
      ? "Generating 3D view"
      : "Scene unavailable";

  const backgroundImage = scene.previewImageUrl ?? heroImageUrl;
  const showViewer = scene.status === "ready" && !!scene.plyUrl;

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface">
      <Image
        src={backgroundImage}
        alt="Post hero"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />

      {showViewer ? (
        <div className="absolute inset-0">
          <SharpSceneViewer
            plyUrl={scene.plyUrl}
            motionEnabled={motionEnabled && !prefersReducedMotion}
            scrollOffset={scrollOffset}
            resetSignal={resetSignal}
            onError={() => setScene({ status: "error" })}
          />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/70" />

      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground shadow">
        <span
          className={`h-2 w-2 rounded-full ${
            scene.status === "ready"
              ? "bg-accent"
              : scene.status === "pending"
              ? "bg-amber-500"
              : "bg-rose-500"
          }`}
        />
        {badgeText}
      </div>

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <button
          type="button"
          onClick={resetView}
          className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-foreground shadow transition-colors hover:border-accent hover:text-accent"
        >
          Reset view
        </button>
        <button
          type="button"
          onClick={requestMotion}
          className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-foreground shadow transition-colors hover:border-accent hover:text-accent"
          disabled={motionEnabled || prefersReducedMotion}
        >
          {motionEnabled ? "Motion on" : "Enable motion"}
        </button>
      </div>

      {motionMessage ? (
        <div className="absolute left-4 bottom-4 max-w-sm rounded-xl border border-border bg-background/85 px-3 py-2 text-xs text-foreground shadow">
          {motionMessage}
        </div>
      ) : null}
    </div>
  );
}
