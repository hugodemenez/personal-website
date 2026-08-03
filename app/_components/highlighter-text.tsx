"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface HighlighterTextProps {
  /** The text the marker sweeps over. Plain text — the range maths reads lines. */
  children: string;
  className?: string;
  /** Stable string the wobble is derived from, so a re-measure redraws the same
   *  stroke rather than a new one. */
  seed: string;
  /** Inline content that trails the text and is left unmarked (a date, say). */
  trailing?: ReactNode;
}

interface MarkerStroke {
  /** Second, narrower pass — where a real nib doubles back and the ink pools. */
  corePath: string;
  coreWidth: number;
  delay: number;
  duration: number;
  path: string;
  width: number;
}

/**
 * Hash a string into a small deterministic PRNG (mulberry32 over an FNV-1a seed).
 * Every stroke shape comes out of this, so the marks look hand-made but never
 * change under the reader — including between measurements.
 */
function createRandom(seed: string): () => number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash = (hash + 0x6d2b79f5) | 0;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

interface Point {
  x: number;
  y: number;
}

/** Quadratic smoothing through the midpoints — a nib never travels in facets. */
function toSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    const midX = (point.x + next.x) / 2;
    const midY = (point.y + next.y) / 2;

    path += ` Q ${point.x.toFixed(2)} ${point.y.toFixed(2)} ${midX.toFixed(
      2
    )} ${midY.toFixed(2)}`;
  }

  const last = points[points.length - 1];
  return `${path} L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
}

interface LineBox {
  height: number;
  left: number;
  /** Furthest right the nib may travel, in host coordinates. */
  limit: number;
  right: number;
  top: number;
}

/**
 * One pass of the marker over a line: overshoots both ends by a hair, drifts off
 * level, and wanders vertically the way a hand does.
 */
function buildStroke(
  line: LineBox,
  random: () => number,
  lift: number,
  tilt: number
): { path: string; width: number } {
  const start = Math.max(-8, line.left - (2 + random() * 7));
  const end = Math.min(line.limit, line.right + (3 + random() * 11));
  const centre = line.top + line.height * lift;
  const wander = line.height * 0.09;
  const segments = 4 + Math.floor(random() * 3);
  const points: Point[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    // Ends stay near the centre line; the wobble peaks mid-stroke.
    const ease = Math.sin(progress * Math.PI);

    points.push({
      x: start + (end - start) * progress,
      y:
        centre +
        tilt * (progress - 0.5) * line.height +
        (random() - 0.5) * 2 * wander * ease,
    });
  }

  return { path: toSmoothPath(points), width: end - start };
}

/**
 * Draws a hand-made highlighter mark behind its text, one stroke per rendered
 * line, sweeping left to right as the block scrolls into view.
 */
export default function HighlighterText({
  children,
  className,
  seed,
  trailing,
}: HighlighterTextProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const filterId = `highlighter-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const [strokes, setStrokes] = useState<MarkerStroke[]>([]);
  const [box, setBox] = useState({ height: 0, width: 0 });
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const text = textRef.current;
    if (!host || !text) return;

    const measure = () => {
      const hostBox = host.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(text);

      // A line that fills the column has no room left for the overshoot, and the
      // page gutter is all that stands between the nib and the viewport edge.
      const overshootLimit = hostBox.width + 8;

      // One rect per rendered line — this is what lets a wrapped sentence get a
      // separate stroke per line instead of one bar across the whole block.
      const lines: LineBox[] = Array.from(range.getClientRects())
        .filter((rect) => rect.width > 1 && rect.height > 1)
        .map((rect) => ({
          height: rect.height,
          left: rect.left - hostBox.left,
          limit: overshootLimit,
          right: rect.right - hostBox.left,
          top: rect.top - hostBox.top,
        }));

      if (!lines.length) return;

      const random = createRandom(seed);
      let elapsed = 0;

      setBox({ height: hostBox.height, width: hostBox.width });
      setStrokes(
        lines.map((line) => {
          const lift = 0.54 + random() * 0.07;
          const tilt = (random() - 0.5) * 0.18;
          const main = buildStroke(line, random, lift, tilt);
          // The doubling-back pass rides a touch lower and stops a little short.
          const core = buildStroke(
            { ...line, right: line.right - random() * 14 },
            random,
            lift + 0.06,
            tilt * 0.6
          );
          const duration = Math.min(560, Math.max(260, main.width * 1.15));
          const delay = elapsed;

          // Lines overlap slightly, like a hand already moving to the next one.
          elapsed += duration * 0.78;

          return {
            corePath: core.path,
            coreWidth: line.height * 0.42,
            delay,
            duration,
            path: main.path,
            width: line.height * 0.78,
          };
        })
      );
    };

    measure();

    // ResizeObserver never fires for a non-replaced inline box, and the host is
    // one — watch the block that lays it out, and the window as a backstop.
    const observer = new ResizeObserver(measure);
    observer.observe(host.parentElement ?? host);
    window.addEventListener("resize", measure);
    // Web fonts land after first paint and reflow the lines under the strokes.
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [children, seed]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDrawn(true);
      return;
    }

    // Two observers, deliberately far apart, so the mark can be drawn again on
    // a later pass without ever being caught erasing itself on screen.
    //
    // Draw: waits until the line has cleared the lower fifth of the screen, so
    // the stroke lands where the reader is looking rather than at the edge.
    const drawObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setDrawn(true);
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0.9 }
    );

    // Re-arm: only once the line is fully off screen. The gap between the two
    // conditions is the hysteresis — nothing resets while it is still in view.
    const armObserver = new IntersectionObserver(
      (entries) => {
        if (entries.every((entry) => !entry.isIntersecting)) setDrawn(false);
      },
      { threshold: 0 }
    );

    drawObserver.observe(host);
    armObserver.observe(host);

    return () => {
      drawObserver.disconnect();
      armObserver.disconnect();
    };
  }, []);

  return (
    <span className={`relative ${className ?? ""}`} ref={hostRef}>
      {strokes.length ? (
        <svg
          aria-hidden="true"
          className="highlighter-ink pointer-events-none absolute left-0 top-0 overflow-visible text-accent-light dark:text-accent"
          height={box.height}
          viewBox={`0 0 ${box.width} ${box.height}`}
          width={box.width}
        >
          <defs>
            {/* Roughs up the edges: a marker bleeds into the paper grain, it
                does not lay down a clean rectangle. */}
            <filter
              filterUnits="userSpaceOnUse"
              height={box.height + 24}
              id={filterId}
              width={box.width + 32}
              x={-16}
              y={-12}
            >
              <feTurbulence
                baseFrequency="0.022 0.38"
                numOctaves={2}
                result="grain"
                seed={seed.length * 7}
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
            {strokes.map((stroke, index) => (
              <g key={index}>
                <path
                  d={stroke.path}
                  fill="none"
                  pathLength={1}
                  stroke="currentColor"
                  strokeDasharray="1 1"
                  strokeDashoffset={drawn ? 0 : 1}
                  strokeLinecap="butt"
                  strokeOpacity={0.78}
                  strokeWidth={stroke.width}
                  style={{
                    // Only the drawing direction is animated. Re-arming happens
                    // off screen and must be instant, or a quick scroll back
                    // catches the mark halfway through erasing itself.
                    transition: drawn
                      ? `stroke-dashoffset ${stroke.duration}ms cubic-bezier(0.3,0.7,0.4,1) ${stroke.delay}ms`
                      : "none",
                  }}
                />
                <path
                  d={stroke.corePath}
                  fill="none"
                  pathLength={1}
                  stroke="currentColor"
                  strokeDasharray="1 1"
                  strokeDashoffset={drawn ? 0 : 1}
                  strokeLinecap="butt"
                  strokeOpacity={0.5}
                  strokeWidth={stroke.coreWidth}
                  style={{
                    transition: drawn
                      ? `stroke-dashoffset ${stroke.duration}ms cubic-bezier(0.3,0.7,0.4,1) ${
                          stroke.delay + stroke.duration * 0.16
                        }ms`
                      : "none",
                  }}
                />
              </g>
            ))}
          </g>
        </svg>
      ) : null}

      <span className="relative" ref={textRef}>
        {children}
      </span>
      {trailing}
    </span>
  );
}
