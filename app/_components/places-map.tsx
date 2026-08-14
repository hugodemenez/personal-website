"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { VisitedPlace } from "@/server/location-data";
import {
  MAP_HEIGHT,
  MAP_PADDING,
  MAP_WIDTH,
  continentPaths,
  stayKind,
  zoneCircles,
  type StayKind,
} from "@/lib/world-map";

interface PlacesMapProps {
  places: VisitedPlace[];
}

function CircleSwatch({ kind }: { kind: StayKind }) {
  return (
    <svg
      aria-hidden="true"
      className={`inline-block size-3.5 -translate-y-px overflow-visible ${
        kind === "habitual" ? "text-accent" : "text-muted/70"
      }`}
      viewBox="0 0 16 16"
    >
      <path
        d="M 3.2 8.4 Q 3.6 3.8 8.1 3.4 T 13.1 8.2 Q 12.4 12.8 7.8 12.6 T 3.4 8.1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={kind === "habitual" ? 1.6 : 1.25}
      />
    </svg>
  );
}

export default function PlacesMap({ places }: PlacesMapProps) {
  const filterId = `map-ink-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const circleFilterId = `map-circle-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const sectionRef = useRef<HTMLElement>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const continents = useMemo(() => continentPaths(), []);
  const circles = useMemo(() => zoneCircles(places), [places]);
  const habitual = places.filter((place) => stayKind(place, places) === "habitual");
  const casual = places.filter((place) => stayKind(place, places) === "casual");
  const active = circles.find((circle) => circle.city === activeCity) ?? null;

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
        A rough map of the regions the days have gone, not a survey.
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
            const isActive = active?.city === circle.city;
            const habitualMark = circle.kind === "habitual";
            return (
              <g
                className={
                  habitualMark
                    ? "cursor-pointer text-accent"
                    : "cursor-pointer text-muted/70"
                }
                key={`${circle.city}-${circle.kind}`}
                onClick={() =>
                  setActiveCity((current) =>
                    current === circle.city ? null : circle.city
                  )
                }
                onMouseEnter={() => setActiveCity(circle.city)}
                onMouseLeave={() =>
                  setActiveCity((current) =>
                    current === circle.city ? null : current
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
        </g>

        {active ? (
          <text
            className="fill-foreground"
            fontSize="14"
            textAnchor={active.x > MAP_WIDTH * 0.62 ? "end" : "start"}
            x={active.x + (active.x > MAP_WIDTH * 0.62 ? -22 : 22)}
            y={active.y - 26}
          >
            {active.city}
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
      </div>

      {habitual.length || casual.length ? (
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
        </div>
      ) : null}
    </section>
  );
}
