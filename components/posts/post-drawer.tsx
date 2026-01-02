"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

interface PostDrawerProps {
  readonly slug: string;
  readonly title?: string;
  readonly heroSource?: "cover" | "body" | "default";
  readonly children: React.ReactNode;
}

const SNAP_POINTS = [0.35, 0.65, 0.92];

export function PostDrawer({
  slug,
  title,
  heroSource,
  children,
}: PostDrawerProps) {
  const [snapIndex, setSnapIndex] = useState(1);
  const [currentHeight, setCurrentHeight] = useState(SNAP_POINTS[1]);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(currentHeight);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    setCurrentHeight(SNAP_POINTS[snapIndex]);
  }, [snapIndex]);

  useEffect(() => {
    const handleResize = () => {
      if (currentHeight > 0.95) {
        setSnapIndex(2);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentHeight]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    startYRef.current = event.clientY;
    startHeightRef.current = currentHeight;
    sheetRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaY = startYRef.current - event.clientY;
    const deltaHeight = deltaY / (typeof window !== "undefined" ? window.innerHeight : 1);
    const nextHeight = Math.min(Math.max(startHeightRef.current + deltaHeight, 0.25), 0.98);
    setCurrentHeight(nextHeight);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    sheetRef.current?.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    const closestIndex = SNAP_POINTS.reduce(
      (closest, point, index) => {
        const distance = Math.abs(point - currentHeight);
        if (distance < closest.distance) {
          return { index, distance };
        }
        return closest;
      },
      { index: snapIndex, distance: Number.POSITIVE_INFINITY }
    );
    setSnapIndex(closestIndex.index);
  };

  const mobileHeight = `${Math.round(currentHeight * 100)}vh`;

  const motionClasses = prefersReducedMotion ? "" : "transition-[height] duration-200 ease-out";

  const emitScrollProgress = (target: HTMLDivElement | null) => {
    if (!target || typeof window === "undefined") return;
    const progress =
      target.scrollHeight > target.clientHeight
        ? target.scrollTop / (target.scrollHeight - target.clientHeight)
        : 0;
    window.dispatchEvent(
      new CustomEvent("post-drawer-scroll", {
        detail: { progress: Math.min(Math.max(progress, 0), 1) },
      })
    );
  };

  const DrawerContent = (
    <div className="space-y-4">
      <div className="space-y-1">
        {title ? (
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        ) : null}
        <p className="text-sm text-muted">
          Reading view • Hero source: {heroSource ?? "default"}
        </p>
      </div>
      <div className="prose prose-stone dark:prose-invert wrap-break-word">{children}</div>
      <Link
        href={`https://hugodemenez.substack.com/p/${slug}`}
        className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
      >
        View on Substack
      </Link>
    </div>
  );

  return (
    <div className="relative w-full lg:w-[420px] xl:w-[480px] lg:border-l lg:border-border lg:bg-surface/90 lg:backdrop-blur">
      <div
        className="hidden h-screen overflow-y-auto px-6 py-8 lg:block"
        onScroll={(event) => emitScrollProgress(event.currentTarget)}
      >
        {DrawerContent}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 lg:hidden">
        <div
          ref={sheetRef}
          className={`mx-auto max-w-5xl rounded-t-3xl border border-border bg-surface/95 shadow-2xl backdrop-blur ${
            prefersReducedMotion ? "" : "transition-colors"
          }`}
          style={{ height: mobileHeight, touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            className={`mx-auto my-2 h-1.5 w-12 rounded-full bg-border ${motionClasses} ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          />
          <div
            className={`h-[calc(100%-24px)] overflow-y-auto px-4 pb-6 pt-1 ${
              prefersReducedMotion ? "" : "transition-colors duration-200"
            }`}
            onScroll={(event) => emitScrollProgress(event.currentTarget)}
          >
            {DrawerContent}
          </div>
        </div>
      </div>
    </div>
  );
}
