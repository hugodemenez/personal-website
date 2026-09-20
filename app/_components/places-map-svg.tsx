import { type ReactNode } from "react";
import {
  MAP_HEIGHT,
  MAP_PADDING,
  MAP_WIDTH,
  continentPaths,
} from "@/lib/world-map";

const VIEW_WIDTH = MAP_WIDTH + MAP_PADDING * 2;
const VIEW_HEIGHT = MAP_HEIGHT + MAP_PADDING * 2;

export function PlacesMapSvg({ children }: { children?: ReactNode }) {
  const continents = continentPaths();

  return (
    <div
      className="mt-5 w-full text-muted"
      style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
    >
      <svg
        aria-hidden="true"
        className="block size-full overflow-visible"
        viewBox={`${-MAP_PADDING} ${-MAP_PADDING} ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      >
        <defs>
          <filter
            height="108%"
            id="places-map-ink"
            width="108%"
            x="-4%"
            y="-4%"
          >
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
            height={VIEW_HEIGHT + 24}
            id="places-map-circles"
            width={VIEW_WIDTH + 24}
            x={-MAP_PADDING - 12}
            y={-MAP_PADDING - 12}
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

        <g filter="url(#places-map-ink)">
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

        {children}
      </svg>
    </div>
  );
}
