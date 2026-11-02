import { Suspense } from "react";
import { DrawReplay, ReplayButton } from "./draw-replay";
import PlacesBlock from "./places-map";
import { PlacesMapSvg } from "./places-map-svg";
import { getLocationPageData } from "@/server/location";
import { LOCATION_CACHE_TAG } from "@/server/location-data";
import { type PlaceMarkKind } from "@/lib/world-map";
import { cacheLife, cacheTag } from "next/cache";

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

async function CachedPlacesBlock() {
  "use cache";
  cacheLife("location");
  cacheTag(LOCATION_CACHE_TAG);

  const { places } = await getLocationPageData();

  return <PlacesBlock places={places} />;
}

export function PlacesMap() {
  return (
    <DrawReplay>
      <section
        aria-labelledby="places-heading"
        className="mt-10"
        id="places-map"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="places-heading"
            className="font-serif text-3xl tracking-[-0.035em] text-foreground"
          >
            Places
          </h2>
          <ReplayButton label="Replay map drawing" />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A rough map of recent regions, and a couple still ahead.
        </p>

        <Suspense fallback={<PlacesMapSvg />}>
          <CachedPlacesBlock />
        </Suspense>

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
    </DrawReplay>
  );
}
