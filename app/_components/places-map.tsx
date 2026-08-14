"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PlacesMapFrame } from "./places-map-frame";
import type { VisitedPlace } from "@/server/location-data";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  placeListNames,
  wantedCircles,
  zoneCircles,
} from "@/lib/world-map";

interface PlacesMapProps {
  places: VisitedPlace[];
}

export default function PlacesMap({ places }: PlacesMapProps) {
  const circleFilterId = `map-circle-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const sectionRef = useRef<HTMLElement>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const visited = useMemo(() => zoneCircles(places), [places]);
  const wanted = useMemo(() => wantedCircles(), []);
  const circles = useMemo(() => [...visited, ...wanted], [visited, wanted]);
  const lines = useMemo(() => placeListNames(places), [places]);
  const active = circles.find((circle) => circle.label === activeLabel) ?? null;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

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
    <PlacesMapFrame
      casual={lines.casual}
      filterExtra={
        <filter
          filterUnits="userSpaceOnUse"
          height={MAP_HEIGHT + 48}
          id={circleFilterId}
          width={MAP_WIDTH + 48}
          x={-24}
          y={-24}
        >
          <feTurbulence
            baseFrequency="0.04"
            numOctaves={2}
            result="grain"
            seed={11}
            type="fractalNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="grain"
            scale={1.8}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      }
      habitual={lines.habitual}
      sectionRef={sectionRef}
      wanted={lines.wanted}
    >
        <g filter={`url(#${circleFilterId})`}>
          {circles.map((circle, index) => {
            const isActive = active?.label === circle.label;
            const habitualMark = circle.kind === "habitual";
            const wantedMark = circle.kind === "wanted";
            return (
              <g
                className={
                  habitualMark
                    ? "cursor-pointer text-accent"
                    : wantedMark
                      ? "cursor-pointer text-accent-light"
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
                  strokeDasharray={circle.dashed ? "0.2 0.09" : "1 1"}
                  strokeDashoffset={drawn ? 0 : 1}
                  strokeLinecap="round"
                  strokeOpacity={
                    isActive ? 0.95 : habitualMark ? 0.88 : wantedMark ? 0.9 : 0.62
                  }
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
        </g>

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
    </PlacesMapFrame>
  );
}
