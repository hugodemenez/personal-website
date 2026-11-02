"use client";

import {
  RESUME_PLACE_COLUMNS,
  RESUME_PLACES,
} from "@/lib/resume-places";
import {
  nextResumeIndex,
  previousResumeIndex,
} from "@/lib/resume-list";
import { useRef, type PointerEvent } from "react";

const SWIPE_PX = 40;

function Chevron({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d={direction === "prev" ? "M10.25 3.5 5.75 8l4.5 4.5" : "M5.75 3.5 10.25 8l-4.5 4.5"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function PlacesCarousel({
  activeKey,
  onSelect,
}: {
  activeKey: string | null;
  onSelect: (key: string) => void;
}) {
  const count = RESUME_PLACES.length;
  const activeIndex = RESUME_PLACES.findIndex((place) => place.label === activeKey);
  const displayIndex = activeIndex >= 0 ? activeIndex : 0;
  const current = RESUME_PLACES[displayIndex];
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);

  if (!current) return null;

  function go(index: number) {
    const place = RESUME_PLACES[index];
    if (!place) return;
    onSelect(place.label);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;

    go(
      dx < 0
        ? nextResumeIndex(count, displayIndex)
        : previousResumeIndex(count, displayIndex)
    );
  }

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
        className="touch-pan-y"
        onPointerCancel={() => {
          swipe.current = null;
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
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
                {current[column.key]}
              </dd>
            </div>
          ))}
        </dl>
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
