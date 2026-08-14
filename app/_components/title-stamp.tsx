"use client";

import { useLayoutEffect, useRef } from "react";
import { getAlbumPiece } from "@/lib/stamp-album";
import { PlayableStamp, type StampOffset } from "./playable-stamp";
import { PostStamp } from "./post-stamp";

interface TitleStampProps {
  fading?: boolean;
  href: string;
  offset: StampOffset;
  onOffset: (offset: StampOffset) => void;
  origin?: DOMRect;
  seed: string;
  src: string;
  external?: boolean;
}

export function TitleStamp({
  fading = false,
  href,
  offset,
  onOffset,
  origin,
  seed,
  src,
  external = false,
}: TitleStampProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(false);
  const piece = getAlbumPiece(seed);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || played.current) return;
    played.current = true;

    if (
      !origin ||
      fading ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const dest = element.getBoundingClientRect();
    const dx = origin.left - dest.left;
    const dy = origin.top - dest.top;
    const sx = dest.width ? origin.width / dest.width : 1;
    const sy = dest.height ? origin.height / dest.height : 1;

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
  }, [fading, origin]);

  return (
    <span
      ref={ref}
      className={`absolute inset-0 ${fading ? "stamp-fade-out" : "stamp-fade-in"}`}
      style={{
        transformOrigin: "top left",
      }}
    >
      <span
        className="block"
        style={{ transform: `rotate(${piece.rotate}deg)` }}
      >
        <PlayableStamp
          allowVerticalScroll
          offset={offset}
          onOffset={(next) =>
            onOffset({
              x: Math.max(-56, Math.min(56, next.x)),
              y: Math.max(-32, Math.min(32, next.y)),
            })
          }
        >
          <PostStamp
            decorative
            external={external}
            href={href}
            seed={seed}
            sizes="96px"
            src={src}
            variant="album"
          />
        </PlayableStamp>
      </span>
    </span>
  );
}
