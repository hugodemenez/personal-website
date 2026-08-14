"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { STAMP_ALBUM_HEIGHT, type AlbumSlot } from "@/lib/stamp-album";
import { albumMountSeeds } from "@/lib/stamp-visibility";
import { PlayableStamp, type StampOffset } from "./playable-stamp";
import { PostStamp } from "./post-stamp";
import { useFadingPresence } from "./use-fading-presence";

export interface AlbumStampItem {
  href: string;
  origin?: DOMRect;
  seed: string;
  src: string;
}

interface StampAlbumProps {
  items: AlbumStampItem[];
  offsets: Record<string, StampOffset>;
  onOffset: (seed: string, offset: StampOffset) => void;
  onPositions?: (rects: Map<string, DOMRect>) => void;
  slots: AlbumSlot[];
}

interface FlyingStampProps {
  fading?: boolean;
  item: AlbumStampItem;
  offset: StampOffset;
  onOffset: (offset: StampOffset) => void;
  slot: AlbumSlot;
}

function FlyingStamp({
  fading = false,
  item,
  offset,
  onOffset,
  slot,
}: FlyingStampProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || played.current) return;
    played.current = true;

    if (
      fading ||
      !item.origin ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const dest = element.getBoundingClientRect();
    const dx = item.origin.left - dest.left;
    const dy = item.origin.top - dest.top;
    const sx = dest.width ? item.origin.width / dest.width : 1;
    const sy = dest.height ? item.origin.height / dest.height : 1;

    if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && Math.abs(sx - 1) < 0.05) {
      return;
    }

    element.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transform: "translate(0, 0) scale(1)" },
      ],
      {
        duration: 560,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        fill: "both",
      }
    );
  }, [fading, item.origin]);

  return (
    <span
      ref={ref}
      className={`absolute will-change-transform ${
        fading ? "stamp-fade-out" : ""
      }`}
      data-stamp-seed={item.seed}
      style={{
        left: slot.x,
        top: slot.y,
        width: slot.width,
        transformOrigin: "top left",
        zIndex: slot.z,
      }}
    >
      <span
        className="block"
        style={{ transform: `rotate(${slot.rotate}deg)` }}
      >
        <PlayableStamp offset={offset} onOffset={onOffset}>
          <PostStamp
            decorative
            href={item.href}
            seed={item.seed}
            sizes="96px"
            src={item.src}
            variant="album"
          />
        </PlayableStamp>
      </span>
    </span>
  );
}

export function StampAlbum({
  items,
  offsets,
  onOffset,
  onPositions,
  slots,
}: StampAlbumProps) {
  const trayRef = useRef<HTMLDivElement>(null);
  const seeds = items.map((item) => item.seed);
  const mountedSeeds = useMemo(
    () => albumMountSeeds(slots, seeds),
    [slots, seeds]
  );
  const { fading, keys } = useFadingPresence(mountedSeeds);
  const bySeed = useMemo(
    () => new Map(items.map((item) => [item.seed, item])),
    [items]
  );
  const slotBySeed = useMemo(() => {
    const map = new Map<string, AlbumSlot>();
    seeds.forEach((seed, index) => {
      const slot = slots[index];
      if (slot) map.set(seed, slot);
    });
    return map;
  }, [seeds, slots]);

  useLayoutEffect(() => {
    const tray = trayRef.current;
    if (!tray || !onPositions) return;

    const rects = new Map<string, DOMRect>();
    tray.querySelectorAll<HTMLElement>("[data-stamp-seed]").forEach((node) => {
      const seed = node.dataset.stampSeed;
      if (seed) rects.set(seed, node.getBoundingClientRect());
    });
    onPositions(rects);
  }, [keys, onPositions, offsets]);

  if (!items.length) return null;

  return (
    <div
      ref={trayRef}
      aria-hidden="true"
      className="relative mt-3"
      style={{ height: STAMP_ALBUM_HEIGHT }}
    >
      {keys.map((seed) => {
        const item = bySeed.get(seed);
        const slot = slotBySeed.get(seed);
        if (!item || !slot) return null;

        return (
          <FlyingStamp
            fading={fading(seed)}
            item={item}
            key={seed}
            offset={offsets[seed] ?? { x: 0, y: 0 }}
            onOffset={(next) => onOffset(seed, next)}
            slot={slot}
          />
        );
      })}
    </div>
  );
}
