"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { VisitedPlace } from "@/server/location-data";
import {
  MAP_WIDTH,
  continentPaths,
  mapViewBox,
  stayKind,
  zoneBrushes,
  type StayKind,
} from "@/lib/world-map";

interface PlacesMapProps {
  places: VisitedPlace[];
}

function BrushSwatch({ kind }: { kind: StayKind }) {
  return (
    <svg
      aria-hidden="true"
      className={`highlighter-ink inline-block h-2.5 w-7 -translate-y-px overflow-visible ${
        kind === "habitual"
          ? "text-accent-light dark:text-accent"
          : "text-muted/55 dark:text-muted/70"
      }`}
      viewBox="0 0 28 10"
    >
      <path
        d="M 1 6 Q 8 3.5 15 5.5 T 27 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="butt"
        strokeOpacity={kind === "habitual" ? 0.82 : 0.7}
        strokeWidth={kind === "habitual" ? 6.2 : 5}
      />
    </svg>
  );
}

export default function PlacesMap({ places }: PlacesMapProps) {
  const filterId = `map-ink-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const brushFilterId = `map-brush-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const sectionRef = useRef<HTMLElement>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const continents = useMemo(() => continentPaths(), []);
  const view = useMemo(() => mapViewBox(places), [places]);
  const brushes = useMemo(() => zoneBrushes(places, view.width), [places, view.width]);
  const coastWidth = Math.max(0.85, 1.35 * (view.width / MAP_WIDTH) * 2);
  const labelSize = 8 + view.width * 0.014;
  const habitual = places.filter((place) => stayKind(place, places) === "habitual");
  const casual = places.filter((place) => stayKind(place, places) === "casual");
  const active = brushes.find((brush) => brush.city === activeCity) ?? null;

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
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
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
            id={brushFilterId}
            width={MAP_WIDTH + 48}
            x={-24}
            y={-24}
          >
            <feTurbulence
              baseFrequency="0.022 0.38"
              numOctaves={2}
              result="grain"
              seed={11}
              type="fractalNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="grain"
              scale={3.4}
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
              strokeWidth={coastWidth}
            />
          ))}
        </g>

        <g className="highlighter-ink" filter={`url(#${brushFilterId})`}>
          {brushes.map((brush, index) => {
            const isActive = active?.city === brush.city;
            const habitualMark = brush.kind === "habitual";
            return (
              <g
                className={
                  habitualMark
                    ? "cursor-pointer text-accent-light dark:text-accent"
                    : "cursor-pointer text-muted/60 dark:text-muted/75"
                }
                key={`${brush.city}-${brush.kind}`}
                onClick={() =>
                  setActiveCity((current) =>
                    current === brush.city ? null : brush.city
                  )
                }
                onMouseEnter={() => setActiveCity(brush.city)}
                onMouseLeave={() =>
                  setActiveCity((current) =>
                    current === brush.city ? null : current
                  )
                }
              >
                <path
                  d={brush.path}
                  fill="none"
                  pathLength={1}
                  stroke="currentColor"
                  strokeDasharray="1 1"
                  strokeDashoffset={drawn ? 0 : 1}
                  strokeLinecap="butt"
                  strokeOpacity={
                    isActive ? 0.92 : habitualMark ? 0.8 : 0.62
                  }
                  strokeWidth={brush.width}
                  style={{
                    transition: drawn
                      ? `stroke-dashoffset 420ms cubic-bezier(0.3,0.7,0.4,1) ${
                          index * 70
                        }ms`
                      : "none",
                  }}
                />
                <path
                  d={brush.corePath}
                  fill="none"
                  pathLength={1}
                  stroke="currentColor"
                  strokeDasharray="1 1"
                  strokeDashoffset={drawn ? 0 : 1}
                  strokeLinecap="butt"
                  strokeOpacity={0.48}
                  strokeWidth={brush.coreWidth}
                  style={{
                    transition: drawn
                      ? `stroke-dashoffset 420ms cubic-bezier(0.3,0.7,0.4,1) ${
                          index * 70 + 70
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
            fontSize={labelSize}
            textAnchor={active.x > view.x + view.width * 0.62 ? "end" : "start"}
            x={
              active.x +
              (active.x > view.x + view.width * 0.62 ? -view.width * 0.04 : view.width * 0.04)
            }
            y={active.y - view.height * 0.06}
          >
            {active.city}
          </text>
        ) : null}
      </svg>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted">
        <p className="inline-flex items-center gap-1.5">
          <BrushSwatch kind="habitual" />
          <span>Most of the time</span>
        </p>
        <p className="inline-flex items-center gap-1.5">
          <BrushSwatch kind="casual" />
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
