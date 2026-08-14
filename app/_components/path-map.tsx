"use client";

import type { PathSketch } from "@/lib/shape-runs";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const DRAW_BUDGET_SECONDS = 1.5;

function drawDurations(count: number, budget: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [budget];

  const sum = (count * (count + 1)) / 2;
  return Array.from({ length: count }, (_, index) => {
    return (budget * (count - index)) / sum;
  });
}

export function PathMap({ sketch }: { sketch: PathSketch }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const node = svgRef.current;
    if (!node) return;

    const paths = [...node.querySelectorAll("path")];
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    for (const path of paths) {
      path.style.strokeDasharray = "1";
      path.style.strokeDashoffset = visible || reduceMotion ? "0" : "1";
      path.style.transition = "none";
    }

    if (!visible || reduceMotion) return;

    node.getBoundingClientRect();
    const durations = drawDurations(paths.length, DRAW_BUDGET_SECONDS);
    let delay = 0;

    paths.forEach((path, index) => {
      const duration = durations[index] ?? 0;
      path.style.transition = `stroke-dashoffset ${duration}s linear ${delay}s`;
      path.style.strokeDashoffset = "0";
      delay += duration;
    });
  }, [visible]);

  return (
    <svg
      ref={svgRef}
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
        className="text-foreground/70 transition-colors group-hover:text-accent"
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
