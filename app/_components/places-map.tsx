"use client";

import { useEffect, useMemo, useState, type PointerEvent } from "react";
import type { VisitedPlace } from "@/server/location-data";
import {
  CIRCLE_DRAW_MS,
  CIRCLE_STAGGER_MS,
  MAP_HEIGHT,
  MAP_PADDING,
  MAP_WIDTH,
  closestPlaceCircle,
  drawOrder,
  wantedCircles,
  zoneCircles,
  type ProjectedPoint,
  type ZoneCircle,
} from "@/lib/world-map";

const VIEW_WIDTH = MAP_WIDTH + MAP_PADDING * 2;
const VIEW_HEIGHT = MAP_HEIGHT + MAP_PADDING * 2;

interface PlaceCirclesProps {
  places: VisitedPlace[];
}

function eventToSvgPoint(event: PointerEvent<Element>): ProjectedPoint | null {
  const svg = event.currentTarget.closest("svg");
  if (!(svg instanceof SVGSVGElement)) return null;

  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const mapped = point.matrixTransform(ctm.inverse());
  return { x: mapped.x, y: mapped.y };
}

function markClass(circle: ZoneCircle): string {
  if (circle.kind === "habitual") return "text-accent";
  if (circle.kind === "wanted") return "text-wish";
  return "text-muted/70";
}

export default function PlaceCircles({ places }: PlaceCirclesProps) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const circles = useMemo(
    () => drawOrder([...wantedCircles(), ...zoneCircles(places)]),
    [places]
  );
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

  function activateClosest(event: PointerEvent<Element>, sticky: boolean) {
    const point = eventToSvgPoint(event);
    if (!point) return;

    const hit = closestPlaceCircle(point, circles);
    if (!hit) {
      setActiveLabel(null);
      return;
    }

    if (sticky) {
      setActiveLabel((current) => (current === hit.label ? null : hit.label));
      return;
    }

    setActiveLabel(hit.label);
  }

  return (
    <g filter="url(#places-map-circles)">
      <rect
        fill="transparent"
        height={VIEW_HEIGHT}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") return;
          activateClosest(event, true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setActiveLabel(null);
        }}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          activateClosest(event, false);
        }}
        width={VIEW_WIDTH}
        x={-MAP_PADDING}
        y={-MAP_PADDING}
      />

      {circles.map((circle, index) => {
        const isActive = active?.label === circle.label;
        return (
          <path
            className={markClass(circle)}
            d={circle.path}
            fill="none"
            key={`${circle.label}-${circle.kind}`}
            pathLength={1}
            pointerEvents="none"
            stroke="currentColor"
            strokeDasharray="1 1"
            strokeDashoffset={drawn ? 0 : 1}
            strokeLinecap="round"
            strokeOpacity={
              isActive ? 0.95 : circle.kind === "casual" ? 0.62 : 0.88
            }
            strokeWidth={circle.width}
            style={{
              transition: drawn
                ? `stroke-dashoffset ${CIRCLE_DRAW_MS}ms cubic-bezier(0.3,0.7,0.4,1) ${
                    index * CIRCLE_STAGGER_MS
                  }ms`
                : "none",
            }}
          />
        );
      })}

      {active ? (
        <text
          className="fill-foreground"
          fontSize="14"
          pointerEvents="none"
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
