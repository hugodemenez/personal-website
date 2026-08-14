"use client";

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

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;

    const paths = [...node.querySelectorAll("path")];
    const hide = () => {
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

    hide();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      return;
    }

    const play = () => {
      cancelAnimationFrame(frameRef.current);
      hide();

      const durations = drawDurations(paths.length, DRAW_BUDGET_MS);
      const starts: number[] = [];
      let mark = 0;
      for (const duration of durations) {
        starts.push(mark);
        mark += duration;
      }

      const begin = performance.now();
      const tick = (now: number) => {
        const elapsed = now - begin;

        paths.forEach((path, index) => {
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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
          return;
        }

        cancelAnimationFrame(frameRef.current);
        hide();
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, [sketch.path, sketch.traces]);

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
