"use client";

import { useDrawReplayToken } from "./draw-replay";
import { PlacesMapSvg } from "./places-map-svg";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { VisitedPlace } from "@/server/location-data";
import {
  CIRCLE_DRAW_MS,
  CIRCLE_STAGGER_MS,
  MAP_HEIGHT,
  MAP_PADDING,
  MAP_WIDTH,
  applyResumeToStayCircles,
  closestPlaceCircle,
  drawOrder,
  wantedCircles,
  zoneCircles,
  type ProjectedPoint,
  type ZoneCircle,
} from "@/lib/world-map";
import { orderResumeList, resumeListItems } from "@/lib/resume-list";

const VIEW_WIDTH = MAP_WIDTH + MAP_PADDING * 2;
const VIEW_HEIGHT = MAP_HEIGHT + MAP_PADDING * 2;

interface PlacesBlockProps {
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

function useFlipList(orderKey: string) {
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const previousTops = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const nextTops = new Map<string, number>();
    for (const [key, node] of itemRefs.current) {
      nextTops.set(key, node.getBoundingClientRect().top);
    }

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduce) {
      for (const [key, node] of itemRefs.current) {
        const previous = previousTops.current.get(key);
        const next = nextTops.get(key);
        if (previous == null || next == null) continue;
        const dy = previous - next;
        if (Math.abs(dy) < 0.5) continue;
        node.animate(
          [{ transform: `translateY(${dy}px)` }, { transform: "none" }],
          { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
      }
    }

    previousTops.current = nextTops;
  }, [orderKey]);

  return (key: string) => (node: HTMLElement | null) => {
    if (node) itemRefs.current.set(key, node);
    else itemRefs.current.delete(key);
  };
}

export default function PlacesBlock({ places }: PlacesBlockProps) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const replayToken = useDrawReplayToken();
  const circles = useMemo(
    () =>
      drawOrder([
        ...wantedCircles(),
        ...applyResumeToStayCircles(zoneCircles(places)),
      ]),
    [places]
  );
  const resumeItems = useMemo(() => resumeListItems(), []);
  const orderedItems = useMemo(
    () => orderResumeList(resumeItems, selectedLabel),
    [resumeItems, selectedLabel]
  );
  const setItemRef = useFlipList(orderedItems.map((item) => item.key).join("\0"));
  const emphasizedLabel = hoveredLabel ?? selectedLabel;

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

    // Two observers, far enough apart that a later pass can redraw without
    // catching the loops erasing themselves on screen.
    const drawObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setDrawn(true);
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.35 }
    );

    const armObserver = new IntersectionObserver(
      (entries) => {
        if (entries.every((entry) => !entry.isIntersecting)) setDrawn(false);
      },
      { threshold: 0 }
    );

    drawObserver.observe(section);
    armObserver.observe(section);
    return () => {
      drawObserver.disconnect();
      armObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (replayToken === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Hide first, then draw after a paint so the dashoffset transition can run
    // from 1 rather than continuing from wherever the last stroke left off.
    setDrawn(false);
    const id = window.setTimeout(() => setDrawn(true), 40);
    return () => window.clearTimeout(id);
  }, [replayToken]);

  function toggleSelected(label: string | null) {
    setSelectedLabel((current) => (current === label ? null : label));
  }

  function activateClosest(
    event: PointerEvent<Element>,
    mode: "hover" | "select"
  ) {
    const point = eventToSvgPoint(event);
    if (!point) return;

    const hit = closestPlaceCircle(point, circles, {
      globalFallback: mode === "select",
    });

    if (mode === "hover") {
      setHoveredLabel(hit?.label ?? null);
      return;
    }

    if (!hit) {
      setSelectedLabel(null);
      return;
    }

    toggleSelected(hit.label);
  }

  return (
    <>
      <PlacesMapSvg>
        <g filter="url(#places-map-circles)">
          <rect
            fill="transparent"
            height={VIEW_HEIGHT}
            onPointerDown={(event) => {
              activateClosest(event, "select");
            }}
            onPointerLeave={() => {
              setHoveredLabel(null);
            }}
            onPointerMove={(event) => {
              if (event.pointerType !== "mouse") return;
              activateClosest(event, "hover");
            }}
            width={VIEW_WIDTH}
            x={-MAP_PADDING}
            y={-MAP_PADDING}
          />

          {circles.map((circle, index) => {
            const isSelected = selectedLabel === circle.label;
            const isEmphasized = emphasizedLabel === circle.label;
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
                  isSelected
                    ? 1
                    : isEmphasized
                      ? 0.95
                      : circle.kind === "casual" || circle.kind === "resume"
                        ? 0.62
                        : 0.88
                }
                strokeWidth={
                  isSelected || isEmphasized ? circle.width + 0.45 : circle.width
                }
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
        </g>
      </PlacesMapSvg>

      <ul
        aria-label="Resume places"
        className="mt-5 space-y-1.5 text-sm leading-snug"
      >
        {orderedItems.map((item) => {
          const selected = selectedLabel === item.key;
          return (
            <li key={item.key} ref={setItemRef(item.key)}>
              <button
                aria-pressed={selected}
                className={`block w-full rounded-sm py-0.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  selected
                    ? "text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
                onClick={() => toggleSelected(item.key)}
                onFocus={() => setHoveredLabel(item.key)}
                onBlur={() => {
                  setHoveredLabel((current) =>
                    current === item.key ? null : current
                  );
                }}
                type="button"
              >
                <span className="font-medium text-foreground">{item.title}</span>
                <span className={selected ? "text-foreground/75" : "text-muted"}>
                  {" — "}
                  {item.detail}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
