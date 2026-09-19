"use client";

import { useDrawReplayToken } from "./draw-replay";
import {
  DRAW_MS,
  DRAW_VISIBLE_RATIO,
  shouldStartDraw,
} from "@/lib/path-draw";
import type { PathSketch } from "@/lib/shape-runs";
import { useEffect, useRef } from "react";

export function PathMap({ sketch }: { sketch: PathSketch }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef(0);
  const playRef = useRef<() => void>(() => {});
  const replayToken = useDrawReplayToken();

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;

    const paths = [...node.querySelectorAll("path")];
    const reset = () => {
      for (const path of paths) {
        path.style.strokeDasharray = "1";
        path.style.strokeDashoffset = "1";
      }
    };
    const reveal = () => {
      for (const path of paths) {
        path.style.strokeDashoffset = "0";
      }
    };

    reset();

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      reveal();
      playRef.current = reveal;
      return;
    }

    const play = () => {
      cancelAnimationFrame(frameRef.current);
      reset();
      if (!paths.length) return;

      const begin = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - begin) / DRAW_MS);
        for (const path of paths) {
          path.style.strokeDashoffset = String(1 - progress);
        }
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        }
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    playRef.current = play;

    let drawn = false;

    // Begin the 1s stroke as soon as about one-third of the map is
    // visible — including on first observe. Do not wait for mid-screen
    // and do not skip the animation just because it is already on screen.
    const drawObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry || drawn) return;
        if (shouldStartDraw(entry.intersectionRatio)) {
          play();
          drawn = true;
        }
      },
      { threshold: DRAW_VISIBLE_RATIO }
    );

    // Reset only once fully off screen so a small scroll back does not
    // hide a path that is still in view.
    const resetObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) return;
        cancelAnimationFrame(frameRef.current);
        reset();
        drawn = false;
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
      {sketch.traces.map((trace) => (
        <path
          d={trace}
          key={trace}
          opacity="0.35"
          pathLength="1"
          stroke="currentColor"
          strokeDasharray="1"
          strokeDashoffset="1"
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
        strokeDashoffset="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
