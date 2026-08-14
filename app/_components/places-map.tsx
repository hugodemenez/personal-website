"use client";

import { useEffect, useMemo, useState } from "react";
import type { VisitedPlace } from "@/server/location-data";
import { MAP_WIDTH, zoneCircles } from "@/lib/world-map";

interface PlaceCirclesProps {
  places: VisitedPlace[];
}

export default function PlaceCircles({ places }: PlaceCirclesProps) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const circles = useMemo(() => zoneCircles(places), [places]);
  const active = circles.find((circle) => circle.label === activeLabel) ?? null;

  useEffect(() => {
    const section = document.getElementById("places-map");
    if (!section) {
      setDrawn(true);
      return;
    }

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDrawn(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setDrawn(true);
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.35 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <g filter="url(#places-map-circles)">
      {circles.map((circle, index) => {
        const isActive = active?.label === circle.label;
        const habitualMark = circle.kind === "habitual";
        return (
          <g
            className={
              habitualMark
                ? "cursor-pointer text-accent"
                : "cursor-pointer text-muted/70"
            }
            key={`${circle.label}-${circle.kind}`}
            onClick={() =>
              setActiveLabel((current) =>
                current === circle.label ? null : circle.label
              )
            }
            onMouseEnter={() => setActiveLabel(circle.label)}
            onMouseLeave={() =>
              setActiveLabel((current) =>
                current === circle.label ? null : current
              )
            }
          >
            <path
              d={circle.path}
              fill="none"
              pathLength={1}
              stroke="currentColor"
              strokeDasharray="1 1"
              strokeDashoffset={drawn ? 0 : 1}
              strokeLinecap="round"
              strokeOpacity={isActive ? 0.95 : habitualMark ? 0.88 : 0.62}
              strokeWidth={circle.width}
              style={{
                transition: drawn
                  ? `stroke-dashoffset 640ms cubic-bezier(0.3,0.7,0.4,1) ${
                      index * 90
                    }ms`
                  : "none",
              }}
            />
          </g>
        );
      })}

      {active ? (
        <text
          className="fill-foreground"
          fontSize="14"
          textAnchor={active.x > MAP_WIDTH * 0.62 ? "end" : "start"}
          x={active.x + (active.x > MAP_WIDTH * 0.62 ? -22 : 22)}
          y={active.y - 26}
        >
          {active.label}
        </text>
      ) : null}
    </g>
  );
}
