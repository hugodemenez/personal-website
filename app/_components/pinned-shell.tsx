"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface PinnedShellProps {
  children: ReactNode;
  className?: string;
  /** Gap to leave between the viewport top and the pinned element, in px. */
  offset?: number;
}

/**
 * Pins its children to the top of the viewport without position: sticky/fixed.
 *
 * iOS 26 Safari reserves an opaque strip at its floating bottom bar whenever the
 * page uses sticky positioning, instead of letting content flow behind the bar.
 * Verified repeatedly on device: sticky here reproduces the strip, this does not.
 * The element stays in normal flow and is only translated, so its computed
 * position stays static and Safari has no positioned element to react to.
 */
export function PinnedShell({
  children,
  className,
  offset = 0,
}: PinnedShellProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Preferred path: hand pinning to the compositor via a scroll-driven
    // animation, so it stays in lockstep with scroll instead of trailing it.
    // The keyframes are inlined in layout.tsx — see the comment there.
    const measureTimeline = () => {
      element.style.animation = "none";
      const naturalTop = element.getBoundingClientRect().top + window.scrollY;
      element.style.animation = "";

      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const pinStart = Math.max(0, naturalTop - offset);

      element.style.setProperty("--pin-start", `${pinStart}px`);
      element.style.setProperty(
        "--pin-distance",
        `${Math.max(0, maxScroll - pinStart)}px`
      );
    };

    element.dataset.pinned = "timeline";
    measureTimeline();

    // Verify the rule actually landed rather than trusting CSS.supports — a
    // build step can strip animation-timeline even where the browser supports it.
    if (getComputedStyle(element).animationName !== "none") {
      // Watch body, not documentElement: html keeps viewport height while the
      // content that changes the scroll range grows inside body.
      const observer = new ResizeObserver(measureTimeline);
      observer.observe(document.body);
      window.addEventListener("resize", measureTimeline);

      return () => {
        observer.disconnect();
        window.removeEventListener("resize", measureTimeline);
        delete element.dataset.pinned;
      };
    }

    delete element.dataset.pinned;
    element.style.removeProperty("--pin-start");
    element.style.removeProperty("--pin-distance");

    // Fallback: drive the same transform from JS. Derived from
    // getBoundingClientRect, which is already relative to the visible viewport —
    // window.scrollY tracks the layout viewport, which drifts from what the user
    // sees by the height of Safari's collapsing toolbar. Subtracting the last
    // applied transform recovers the natural position, so this self-corrects.
    let applied = 0;

    const apply = () => {
      const naturalTop = element.getBoundingClientRect().top - applied;
      const next = Math.max(0, offset - naturalTop);

      if (next === applied) return;
      applied = next;
      element.style.transform = next > 0 ? `translateY(${next}px)` : "";
    };

    const viewport = window.visualViewport;

    apply();
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", apply);
    viewport?.addEventListener("scroll", apply);
    viewport?.addEventListener("resize", apply);

    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      viewport?.removeEventListener("scroll", apply);
      viewport?.removeEventListener("resize", apply);
    };
  }, [offset]);

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}
