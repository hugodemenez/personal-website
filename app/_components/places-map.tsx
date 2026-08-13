"use client";

import { useId, useMemo, useState } from "react";
import type { VisitedPlace } from "@/server/location-data";
import {
  MAP_HEIGHT,
  MAP_PADDING,
  MAP_WIDTH,
  continentPaths,
  formatStay,
  markerRadius,
  projectLocation,
} from "@/lib/world-map";

interface PlacesMapProps {
  places: VisitedPlace[];
}

function placeKey(place: VisitedPlace): string {
  return `${place.city}|${place.country ?? ""}`;
}

export default function PlacesMap({ places }: PlacesMapProps) {
  const filterId = `map-ink-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const continents = useMemo(() => continentPaths(), []);
  const markers = useMemo(
    () =>
      places.map((place) => ({
        place,
        key: placeKey(place),
        ...projectLocation(place.longitude, place.latitude),
        radius: markerRadius(place.days),
      })),
    [places]
  );

  const active = markers.find((marker) => marker.key === activeKey) ?? null;

  return (
    <section aria-labelledby="places-heading" className="mt-10">
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

        {markers.map((marker) => {
          const isActive = active?.key === marker.key;
          return (
            <g
              className="cursor-pointer"
              key={marker.key}
              onClick={() =>
                setActiveKey((current) => (current === marker.key ? null : marker.key))
              }
              onMouseEnter={() => setActiveKey(marker.key)}
              onMouseLeave={() =>
                setActiveKey((current) => (current === marker.key ? null : current))
              }
            >
              {marker.place.isCurrent ? (
                <circle
                  className="fill-none stroke-accent/45"
                  cx={marker.x}
                  cy={marker.y}
                  r={marker.radius + 4.8}
                  strokeWidth="1.15"
                />
              ) : null}
              <circle
                className={
                  marker.place.isCurrent
                    ? "fill-accent stroke-background"
                    : "fill-foreground/65 stroke-background"
                }
                cx={marker.x}
                cy={marker.y}
                r={isActive ? marker.radius + 0.8 : marker.radius}
                strokeWidth="1.2"
              />
            </g>
          );
        })}

        {active ? (
          <text
            className="fill-foreground"
            fontSize="14"
            textAnchor={active.x > MAP_WIDTH * 0.62 ? "end" : "start"}
            x={active.x + (active.x > MAP_WIDTH * 0.62 ? -12 : 12)}
            y={active.y - active.radius - 10}
          >
            {active.place.city}
          </text>
        ) : null}
      </svg>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {places.map((place) => {
          const key = placeKey(place);
          const isActive = activeKey === key;
          return (
            <li key={key}>
              <button
                className={`inline-flex items-baseline gap-1.5 text-left transition-colors ${
                  isActive || place.isCurrent
                    ? "text-foreground"
                    : "hover:text-foreground"
                }`}
                onBlur={() => setActiveKey((current) => (current === key ? null : current))}
                onClick={() => setActiveKey((current) => (current === key ? null : key))}
                onFocus={() => setActiveKey(key)}
                onMouseEnter={() => setActiveKey(key)}
                onMouseLeave={() =>
                  setActiveKey((current) => (current === key ? null : current))
                }
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 translate-y-px rounded-full ${
                    place.isCurrent ? "bg-accent" : "bg-foreground/40"
                  }`}
                />
                <span>
                  {place.city}
                  <span className="text-muted"> · {formatStay(place)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
