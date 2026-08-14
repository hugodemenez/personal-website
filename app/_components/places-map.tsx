"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { VisitedPlace } from "@/server/location-data";
import {
  MAP_HEIGHT,
  MAP_PADDING,
  MAP_WIDTH,
  continentPaths,
  stayKind,
  wantedCircles,
  zoneCircles,
  type PlaceMarkKind,
} from "@/lib/world-map";

interface PlacesMapProps {
  places: VisitedPlace[];
}

function CircleSwatch({ kind }: { kind: PlaceMarkKind }) {
  const dashed = kind === "wanted";
  return (
    <svg
      aria-hidden="true"
      className={`inline-block size-3.5 -translate-y-px overflow-visible ${
        kind === "habitual"
          ? "text-accent"
          : kind === "wanted"
            ? "text-muted/80"
            : "text-muted/70"
      }`}
      viewBox="0 0 16 16"
    >
      <path
        d={
          kind === "habitual"
            ? "M 3.1 8.6 Q 3.4 3.6 8.2 3.3 T 13.2 8.1 Q 12.6 13.0 7.7 12.7 T 3.3 8.4 Q 4.1 4.8 8.0 4.6"
            : kind === "wanted"
              ? "M 3.6 9.2 Q 4.0 4.2 8.2 3.8 T 12.6 8.0 Q 11.8 11.8 8.4 12.2"
              : "M 3.4 8.5 Q 3.8 4.0 8.1 3.6 T 12.8 8.2 Q 12.2 12.6 7.9 12.4 T 3.6 8.3"
        }
        fill="none"
        stroke="currentColor"
        strokeDasharray={dashed ? "1.6 1.15" : undefined}
        strokeLinecap="round"
        strokeWidth={kind === "habitual" ? 1.55 : 1.2}
      />
    </svg>
  );
}

export default function PlacesMap({ places }: PlacesMapProps) {
  const filterId = `map-ink-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const circleFilterId = `map-circle-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const sectionRef = useRef<HTMLElement>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const continents = useMemo(() => continentPaths(), []);
  const visited = useMemo(() => zoneCircles(places), [places]);
  const wanted = useMemo(() => wantedCircles(), []);
  const circles = useMemo(() => [...visited, ...wanted], [visited, wanted]);
  const habitual = places.filter((place) => stayKind(place, places) === "habitual");
  const casual = places.filter((place) => stayKind(place, places) === "casual");
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
    <section
      ref={sectionRef}
      aria-labelledby="places-heading"
      className="mt-10"
    >
      <h2
        id="places-heading"
        className="font-serif text-3xl tracking-[-0.035em] text-foreground"
      >
        Places
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        A rough map of the regions the days have gone, and a couple still ahead.
      </p>

      <svg
        aria-hidden="true"
        className="mt-5 block w-full text-muted"
        viewBox={`${-MAP_PADDING} ${-MAP_PADDING} ${MAP_WIDTH + MAP_PADDING * 2} ${
          MAP_HEIGHT + MAP_PADDING * 2
        }`}
      >
        <defs>
          <filter height="108%" id={filterId} width="108%" x="-4%" y="-4%">
            <feTurbulence
              baseFrequency="0.012"
              numOctaves="2"
              result="noise"
              seed="7"
              type="fractalNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.35"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
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
        </defs>

        <g filter={`url(#${filterId})`}>
          {continents.map((continent) => (
            <path
              className="fill-surface stroke-current"
              d={continent.d}
              key={continent.name}
              strokeLinejoin="round"
              strokeWidth="1.35"
            />
          ))}
        </g>

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
                      ? "cursor-pointer text-muted"
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
                  strokeDasharray={circle.dashed ? "0.16 0.1" : "1 1"}
                  strokeDashoffset={drawn ? 0 : 1}
                  strokeLinecap="round"
                  strokeOpacity={
                    isActive ? 0.95 : habitualMark ? 0.88 : wantedMark ? 0.78 : 0.62
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
      </svg>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted">
        <p className="inline-flex items-center gap-1.5">
          <CircleSwatch kind="habitual" />
          <span>Most of the time</span>
        </p>
        <p className="inline-flex items-center gap-1.5">
          <CircleSwatch kind="casual" />
          <span>Casual</span>
        </p>
        <p className="inline-flex items-center gap-1.5">
          <CircleSwatch kind="wanted" />
          <span>I&apos;d like to go</span>
        </p>
      </div>

      {habitual.length || casual.length || wanted.length ? (
        <div className="mt-3 space-y-1 text-xs leading-relaxed text-muted">
          {habitual.length ? (
            <p>
              <span className="text-foreground">Most of the time</span>
              {" · "}
              {habitual.map((place) => place.city).join(" · ")}
            </p>
          ) : null}
          {casual.length ? (
            <p>
              <span className="text-foreground">Casual</span>
              {" · "}
              {casual.map((place) => place.city).join(" · ")}
            </p>
          ) : null}
          {wanted.length ? (
            <p>
              <span className="text-foreground">I&apos;d like to go</span>
              {" · "}
              {wanted.map((place) => place.label).join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
