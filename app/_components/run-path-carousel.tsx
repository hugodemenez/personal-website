"use client";

import type { DistinctPath, PathSketch } from "@/lib/shape-runs";
import { useEffect, useRef, useState } from "react";

function PathMap({ sketch }: { sketch: PathSketch }) {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto h-20 w-[15rem] text-muted/45"
      fill="none"
      shapeRendering="geometricPrecision"
      viewBox={`0 0 ${sketch.width} ${sketch.height}`}
    >
      {sketch.traces.map((trace) => (
        <path
          d={trace}
          key={trace}
          opacity="0.35"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.2"
        />
      ))}
      <path
        className="text-foreground/70 transition-colors group-hover:text-accent"
        d={sketch.path}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function PathCard({ path }: { path: DistinctPath }) {
  const stats = [
    path.run.distanceLabel,
    path.run.durationLabel,
    path.run.paceLabel,
  ].filter(Boolean);
  const content = (
    <>
      {path.sketch ? <PathMap sketch={path.sketch} /> : null}
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate text-[1.05rem] leading-snug tracking-[-0.015em] text-foreground transition-colors group-hover:text-accent">
          {path.run.title}
        </h3>
        <time
          className="shrink-0 text-sm tabular-nums text-muted/70"
          dateTime={path.run.date}
        >
          {path.run.dateLabel}
        </time>
      </div>
      {stats.length ? (
        <p className="mt-1 text-sm tabular-nums text-muted/70">
          {stats.join(" · ")}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-muted/70">
        {path.count === 1
          ? "One run on these streets"
          : `${path.count} runs on these streets`}
      </p>
    </>
  );

  if (path.run.href) {
    return (
      <a
        className="group block"
        href={path.run.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {content}
      </a>
    );
  }

  return <div>{content}</div>;
}

export function RunPathCarousel({ paths }: { paths: DistinctPath[] }) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const multiple = paths.length > 1;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateIndex = () => {
      const slides = [...scroller.children] as HTMLElement[];
      if (!slides.length) return;
      const nearest = slides.reduce((best, slide, slideIndex) => {
        const distance = Math.abs(slide.offsetLeft - scroller.scrollLeft);
        return distance < best.distance ? { index: slideIndex, distance } : best;
      }, { index: 0, distance: Number.POSITIVE_INFINITY });
      setIndex(nearest.index);
    };

    updateIndex();
    scroller.addEventListener("scroll", updateIndex, { passive: true });
    return () => scroller.removeEventListener("scroll", updateIndex);
  }, [paths.length]);

  const goTo = (nextIndex: number) => {
    const scroller = scrollerRef.current;
    const slide = scroller?.children[nextIndex] as HTMLElement | undefined;
    if (!scroller || !slide) return;

    const shouldReduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    scroller.scrollTo({
      left: slide.offsetLeft,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <div className="mt-5">
      {multiple ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm tabular-nums text-muted/70">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(paths.length).padStart(2, "0")}
          </p>
          <div className="flex items-center gap-3">
            <button
              aria-label="Previous path"
              className="min-h-11 text-sm text-muted transition-colors hover:text-accent disabled:text-muted/40"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
              type="button"
            >
              ←
            </button>
            <button
              aria-label="Next path"
              className="min-h-11 text-sm text-muted transition-colors hover:text-accent disabled:text-muted/40"
              disabled={index === paths.length - 1}
              onClick={() => goTo(index + 1)}
              type="button"
            >
              →
            </button>
          </div>
        </div>
      ) : null}

      <ul
        ref={scrollerRef}
        aria-label="Distinct running paths"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {paths.map((path) => (
          <li
            key={path.run.id}
            aria-label={`${path.run.title}, ${path.count === 1 ? "one run" : `${path.count} runs`} on these streets`}
            aria-roledescription="slide"
            className="w-full min-w-full shrink-0 snap-start"
          >
            <PathCard path={path} />
          </li>
        ))}
      </ul>
    </div>
  );
}
