"use client";

import { useLayoutEffect, useRef } from "react";
import { STAMP_ALBUM_HEIGHT, type AlbumSlot } from "@/lib/stamp-album";
import { PostStamp } from "./post-stamp";

export interface AlbumStampItem {
  href: string;
  origin?: DOMRect;
  seed: string;
  src: string;
}

interface StampAlbumProps {
  items: AlbumStampItem[];
  slots: AlbumSlot[];
}

interface FlyingStampProps {
  item: AlbumStampItem;
  slot: AlbumSlot;
}

function FlyingStamp({ item, slot }: FlyingStampProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || played.current) return;
    played.current = true;

    if (
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
  }, [item.origin]);

  return (
    <span
      ref={ref}
      className="absolute will-change-transform"
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
        <PostStamp
          decorative
          href={item.href}
          seed={item.seed}
          sizes="96px"
          src={item.src}
          variant="album"
        />
      </span>
    </span>
  );
}

export function StampAlbum({ items, slots }: StampAlbumProps) {
  if (!items.length) return null;

  return (
    <div
      aria-hidden="true"
      className="relative mt-3"
      style={{ height: STAMP_ALBUM_HEIGHT }}
    >
      {items.map((item, index) => {
        const slot = slots[index];
        if (!slot) return null;

        return <FlyingStamp item={item} key={item.seed} slot={slot} />;
      })}
    </div>
  );
}
