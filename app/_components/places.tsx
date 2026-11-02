"use client";

import {
  RESUME_PLACE_COLUMNS,
  RESUME_PLACES,
  type ResumePlace,
} from "@/lib/resume-places";
import {
  nextResumeIndex,
  previousResumeIndex,
} from "@/lib/resume-list";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const SWIPE_PX = 40;
const SLIDE_MS = 420;
const SLIDE_EASE = "cubic-bezier(0.3,0.7,0.4,1)";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function Chevron({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d={
          direction === "prev"
            ? "M10.25 3.5 5.75 8l4.5 4.5"
            : "M5.75 3.5 10.25 8l-4.5 4.5"
        }
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function PlaceSlide({ place }: { place: ResumePlace }) {
  return (
    <dl className="min-h-[9.75rem] text-sm leading-snug">
      {RESUME_PLACE_COLUMNS.map((column) => (
        <div
          className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-x-3 py-0.5 first:pt-0"
          key={column.key}
        >
          <dt className="text-xs text-muted/80">{column.header}</dt>
          <dd
            className={
              column.key === "place"
                ? "font-medium text-foreground"
                : column.key === "year"
                  ? "text-muted tabular-nums"
                  : "text-muted"
            }
          >
            {place[column.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function realIndexFromTrack(trackIndex: number, count: number): number {
  if (trackIndex <= 0) return count - 1;
  if (trackIndex >= count + 1) return 0;
  return trackIndex - 1;
}

export function PlacesCarousel({
  activeKey,
  onSelect,
}: {
  activeKey: string | null;
  onSelect: (key: string) => void;
}) {
  const count = RESUME_PLACES.length;
  const slides =
    count > 0
      ? [RESUME_PLACES[count - 1], ...RESUME_PLACES, RESUME_PLACES[0]]
      : [];
  const activeIndex = RESUME_PLACES.findIndex((place) => place.label === activeKey);
  const displayIndex = activeIndex >= 0 ? activeIndex : 0;

  const [trackIndex, setTrackIndex] = useState(1);
  const [animate, setAnimate] = useState(true);
  const [dragPx, setDragPx] = useState(0);
  const trackIndexRef = useRef(1);
  const snapToRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const swipeRef = useRef<{ id: number; x: number; y: number } | null>(null);

  trackIndexRef.current = trackIndex;

  useEffect(() => {
    if (count === 0) return;
    const target = activeIndex >= 0 ? activeIndex : 0;
    const current = realIndexFromTrack(trackIndexRef.current, count);
    if (current === target && trackIndexRef.current === target + 1) return;

    if (prefersReducedMotion()) {
      snapToRef.current = null;
      setAnimate(false);
      setTrackIndex(target + 1);
      return;
    }

    let delta = target - current;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    if (delta === 0) return;

    setAnimate(true);
    if (delta === 1 && current === count - 1) {
      snapToRef.current = 1;
      setTrackIndex(count + 1);
      return;
    }
    if (delta === -1 && current === 0) {
      snapToRef.current = count;
      setTrackIndex(0);
      return;
    }
    snapToRef.current = null;
    setTrackIndex(target + 1);
  }, [activeIndex, count]);

  useEffect(() => {
    if (animate) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setAnimate(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [animate, trackIndex]);

  if (count === 0) return null;

  function go(index: number) {
    const place = RESUME_PLACES[index];
    if (!place) return;
    onSelect(place.label);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    swipeRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    draggingRef.current = false;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = swipeRef.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!draggingRef.current) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDragPx(dx);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = swipeRef.current;
    swipeRef.current = null;
    const dx = start && start.id === event.pointerId ? event.clientX - start.x : 0;
    const dragged = draggingRef.current;
    draggingRef.current = false;
    if (!dragged) return;
    setAnimate(false);
    setDragPx(0);
    if (Math.abs(dx) < SWIPE_PX) return;
    go(
      dx < 0
        ? nextResumeIndex(count, displayIndex)
        : previousResumeIndex(count, displayIndex)
    );
  }

  function onTransitionEnd() {
    const snapTo = snapToRef.current;
    if (snapTo == null) return;
    snapToRef.current = null;
    setAnimate(false);
    setTrackIndex(snapTo);
  }

  const reduceMotion = animate === false || prefersReducedMotion();

  return (
    <div
      aria-label="Places"
      aria-roledescription="carousel"
      className="min-w-0 select-none"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(nextResumeIndex(count, displayIndex));
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(previousResumeIndex(count, displayIndex));
        }
      }}
      role="group"
    >
      <div
        className="w-full overflow-hidden touch-pan-y"
        onPointerCancel={() => {
          swipeRef.current = null;
          draggingRef.current = false;
          setDragPx(0);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="flex w-full"
          data-places-track
          onTransitionEnd={onTransitionEnd}
          style={{
            transform: `translate3d(calc(${-trackIndex * 100}% + ${dragPx}px), 0, 0)`,
            transition:
              dragPx !== 0 || reduceMotion
                ? "none"
                : `transform ${SLIDE_MS}ms ${SLIDE_EASE}`,
          }}
        >
          {slides.map((place, index) => {
            const clone = index === 0 || index === slides.length - 1;
            const selected = !clone && index - 1 === displayIndex;
            return (
              <div
                aria-hidden={clone || !selected ? true : undefined}
                className="box-border w-full min-w-full shrink-0 basis-full"
                data-places-slide={place.place}
                key={`${place.label}-${index}`}
              >
                <PlaceSlide place={place} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          aria-label="Previous place"
          className="relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center text-muted/70 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          onClick={() => go(previousResumeIndex(count, displayIndex))}
          type="button"
        >
          <Chevron direction="prev" />
        </button>
        <div className="flex items-center gap-1.5">
          {RESUME_PLACES.map((place, index) => {
            const selected = index === displayIndex;
            return (
              <button
                aria-current={selected ? "true" : undefined}
                aria-label={`${place.place}, ${index + 1} of ${count}`}
                className={`size-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  selected ? "bg-accent" : "bg-border hover:bg-muted/50"
                }`}
                key={place.label}
                onClick={() => go(index)}
                type="button"
              />
            );
          })}
        </div>
        <button
          aria-label="Next place"
          className="relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center text-muted/70 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          onClick={() => go(nextResumeIndex(count, displayIndex))}
          type="button"
        >
          <Chevron direction="next" />
        </button>
      </div>
    </div>
  );
}
