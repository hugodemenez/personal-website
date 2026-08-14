import { Suspense } from "react";
import PlaceCircles from "./places-map";
import { getLocationPageData } from "@/server/location";
import {
  MAP_HEIGHT,
  MAP_PADDING,
  MAP_WIDTH,
  continentPaths,
  type PlaceMarkKind,
} from "@/lib/world-map";
import { cacheLife } from "next/cache";

const VIEW_WIDTH = MAP_WIDTH + MAP_PADDING * 2;
const VIEW_HEIGHT = MAP_HEIGHT + MAP_PADDING * 2;

function CircleSwatch({ kind }: { kind: PlaceMarkKind }) {
  return (
    <svg
      aria-hidden="true"
      className={`inline-block size-3.5 -translate-y-px overflow-visible ${
        kind === "habitual"
          ? "text-accent"
          : kind === "wanted"
            ? "text-wish"
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
        strokeLinecap="round"
        strokeWidth={kind === "habitual" ? 1.55 : 1.2}
      />
    </svg>
  );
}

async function CachedVisitedCircles() {
  "use cache";
  cacheLife("seconds");

  const { places } = await getLocationPageData();

  return <PlaceCircles places={places} />;
}

export function PlacesMap() {
  const continents = continentPaths();

  return (
    <section
      aria-labelledby="places-heading"
      className="mt-10"
      id="places-map"
    >
      <h2
        id="places-heading"
        className="font-serif text-3xl tracking-[-0.035em] text-foreground"
      >
        Places
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        A rough map of recent regions, and a couple still ahead.
      </p>

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
              height={MAP_HEIGHT + 48}
              id="places-map-circles"
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

          <Suspense fallback={null}>
            <CachedVisitedCircles />
          </Suspense>
        </svg>
      </div>

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
    </section>
  );
}
