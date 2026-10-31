"use client";

import { useDrawReplayToken } from "./draw-replay";
import { PlacesMapSvg } from "./places-map-svg";
import { useEffect, useMemo, useState, type PointerEvent } from "react";
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
import {
  isResumeLoopKey,
  nextResumeIndex,
  resumeListItems,
  resumeLoopKeys,
  resumeLoopStepMs,
} from "@/lib/resume-list";

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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function PlacesBlock({ places }: PlacesBlockProps) {
  const [visible, setVisible] = useState(false);
  const [staysDrawn, setStaysDrawn] = useState(false);
  const [showAllResume, setShowAllResume] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [resumeTick, setResumeTick] = useState(0);
  const [resumeDrawn, setResumeDrawn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const replayToken = useDrawReplayToken();
  const resumeItems = useMemo(() => resumeListItems(), []);
  const loopKeys = useMemo(() => resumeLoopKeys(), []);
  const circles = useMemo(
    () =>
      drawOrder([
        ...wantedCircles(),
        ...applyResumeToStayCircles(zoneCircles(places)),
      ]),
    [places]
  );
  const stayCircles = useMemo(
    () => circles.filter((circle) => !isResumeLoopKey(circle.label, loopKeys)),
    [circles, loopKeys]
  );

  function playResume(key: string, pause: boolean) {
    setActiveKey(key);
    setResumeTick((tick) => tick + 1);
    if (pause) setPaused(true);
  }

  useEffect(() => {
    const section = document.getElementById("places-map");
    if (!section) {
      setVisible(true);
      setStaysDrawn(true);
      return;
    }

    if (
      typeof IntersectionObserver === "undefined" ||
      prefersReducedMotion()
    ) {
      setVisible(true);
      setStaysDrawn(true);
      setShowAllResume(true);
      setResumeDrawn(true);
      return;
    }

    // Two observers, far enough apart that a later pass can redraw without
    // catching the loops erasing themselves on screen.
    const drawObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          setStaysDrawn(true);
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.35 }
    );

    const armObserver = new IntersectionObserver(
      (entries) => {
        if (entries.every((entry) => !entry.isIntersecting)) {
          setVisible(false);
          setStaysDrawn(false);
          setPaused(false);
          setActiveKey(null);
          setResumeDrawn(false);
        }
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
    if (prefersReducedMotion()) return;

    setPaused(false);
    setActiveKey(null);
    setResumeDrawn(false);
    setResumeTick((tick) => tick + 1);
    setStaysDrawn(false);
    const id = window.setTimeout(() => setStaysDrawn(true), 40);
    return () => window.clearTimeout(id);
  }, [replayToken]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setResumeDrawn(true);
      return;
    }
    if (!activeKey) {
      setResumeDrawn(false);
      return;
    }

    setResumeDrawn(false);
    const id = window.setTimeout(() => setResumeDrawn(true), 40);
    return () => window.clearTimeout(id);
  }, [activeKey, resumeTick]);

  useEffect(() => {
    if (!visible) return;
    if (prefersReducedMotion()) return;
    if (paused) return;
    if (resumeItems.length === 0) return;

    const currentIndex = resumeItems.findIndex((item) => item.key === activeKey);
    const delay =
      currentIndex < 0 ? 80 : resumeLoopStepMs(CIRCLE_DRAW_MS);

    const id = window.setTimeout(() => {
      const nextIndex = nextResumeIndex(resumeItems.length, currentIndex);
      const next = resumeItems[nextIndex];
      if (!next) return;
      setActiveKey(next.key);
      setResumeTick((tick) => tick + 1);
    }, delay);

    return () => window.clearTimeout(id);
  }, [visible, paused, activeKey, resumeTick, resumeItems]);

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

    if (!hit || !isResumeLoopKey(hit.label, loopKeys)) return;
    playResume(hit.label, true);
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

          {circles.map((circle) => {
            const resumeBeat = isResumeLoopKey(circle.label, loopKeys);
            const isActiveResume = resumeBeat && activeKey === circle.label;
            const show = resumeBeat
              ? showAllResume || (isActiveResume && resumeDrawn)
              : staysDrawn;
            const stayIndex = stayCircles.findIndex(
              (entry) =>
                entry.label === circle.label && entry.kind === circle.kind
            );
            const isEmphasized =
              isActiveResume ||
              (hoveredLabel === circle.label && show);
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
                strokeDashoffset={show ? 0 : 1}
                strokeLinecap="round"
                strokeOpacity={
                  isEmphasized
                    ? 1
                    : circle.kind === "casual" || circle.kind === "resume"
                      ? 0.62
                      : 0.88
                }
                strokeWidth={isEmphasized ? circle.width + 0.45 : circle.width}
                style={{
                  transition: show
                    ? `stroke-dashoffset ${CIRCLE_DRAW_MS}ms cubic-bezier(0.3,0.7,0.4,1) ${
                        resumeBeat
                          ? 0
                          : Math.max(stayIndex, 0) * CIRCLE_STAGGER_MS
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
        {resumeItems.map((item) => {
          const active = activeKey === item.key;
          return (
            <li key={item.key}>
              <button
                aria-current={active ? "true" : undefined}
                className={`-ml-2 block w-full rounded-sm border-l-2 py-0.5 pl-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  active
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
                onClick={() => playResume(item.key, true)}
                type="button"
              >
                <span className="font-medium">{item.title}</span>
                <span className={active ? "text-foreground/70" : ""}>
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
