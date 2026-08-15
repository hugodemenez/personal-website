"use client";

import { useDrawReplayToken } from "./draw-replay";
import type { PathSketch } from "@/lib/shape-runs";
import { useEffect, useRef } from "react";

const DRAW_BUDGET_MS = 5000;

function drawDurations(count: number, budget: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [budget];

  const last = budget / 2;
  const each = (budget - last) / (count - 1);
  return [...Array.from({ length: count - 1 }, () => each), last];
}

export function PathMap({ sketch }: { sketch: PathSketch }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef(0);
  const playRef = useRef<() => void>(() => {});
  const replayToken = useDrawReplayToken();

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;

    const paths = [...node.querySelectorAll("path")];
    // The first stroke is the earliest run. Keep it painted so a path is
    // visible before the later loops start drawing.
    const animated = paths.slice(1);
    const reset = () => {
      for (const [index, path] of paths.entries()) {
        path.style.strokeDasharray = "1";
        path.style.strokeDashoffset = index === 0 ? "0" : "1";
      }
    };
    const reveal = () => {
      for (const path of paths) {
        path.style.strokeDashoffset = "0";
      }
    };

    reset();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      playRef.current = reveal;
      return;
    }

    const play = () => {
      cancelAnimationFrame(frameRef.current);
      reset();

      if (!animated.length) return;

      const durations = drawDurations(animated.length, DRAW_BUDGET_MS);
      const starts: number[] = [];
      let mark = 0;
      for (const duration of durations) {
        starts.push(mark);
        mark += duration;
      }

      const begin = performance.now();
      const tick = (now: number) => {
        const elapsed = now - begin;

        animated.forEach((path, index) => {
          const duration = durations[index] ?? 1;
          const local = (elapsed - (starts[index] ?? 0)) / duration;
          const progress = Math.min(1, Math.max(0, local));
          path.style.strokeDashoffset = String(1 - progress);
        });

        if (elapsed < mark) {
          frameRef.current = requestAnimationFrame(tick);
        }
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    playRef.current = play;

    // Two observers, far enough apart that a later pass can redraw without
    // catching the paths erasing themselves on screen.
    //
    // Draw: wait until the map has reached the middle of the screen, so the
    // stroke starts where the reader is looking rather than at the edge.
    // The SVGs are short, so a threshold alone still fires at the bottom.
    const drawObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) play();
      },
      { rootMargin: "0px 0px -45% 0px", threshold: 0.35 }
    );

    // Reset only once fully off screen. A small scroll back into the lower
    // half should not hide paths that are still in view.
    const resetObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) return;
        cancelAnimationFrame(frameRef.current);
        reset();
      },
      { threshold: 0 }
    );

    drawObserver.observe(node);
    resetObserver.observe(node);
    return () => {
      drawObserver.disconnect();
      resetObserver.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, [sketch.path, sketch.traces]);

  useEffect(() => {
    if (replayToken === 0) return;
    playRef.current();
  }, [replayToken]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="mx-auto h-16 w-full max-w-[11rem] text-muted/45 sm:h-20 sm:max-w-[15rem]"
      fill="none"
      shapeRendering="geometricPrecision"
      viewBox={`0 0 ${sketch.width} ${sketch.height}`}
    >
      {sketch.traces.map((trace, index) => (
        <path
          d={trace}
          key={trace}
          opacity="0.35"
          pathLength="1"
          stroke="currentColor"
          strokeDasharray="1"
          strokeDashoffset={index === 0 ? "0" : "1"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.2"
        />
      ))}
      <path
        className="text-accent"
        d={sketch.path}
        pathLength="1"
        stroke="currentColor"
        strokeDasharray="1"
        strokeDashoffset={sketch.traces.length === 0 ? "0" : "1"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
