"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface PinnedShellProps {
  children: ReactNode;
  className?: string;
  /** Gap to leave between the viewport top and the pinned element, in px. */
  offset?: number;
  /**
   * Scroll distance to stay pinned for, in px. After it, the element holds a
   * constant translate and so scrolls away with the page again. Omit to stay
   * pinned to the bottom of the document.
   */
  releaseAfter?: number;
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
  releaseAfter,
}: PinnedShellProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Preferred path: hand pinning to the compositor via a scroll-driven
    // animation, so it stays in lockstep with scroll instead of trailing it.
    // The keyframes are inlined in layout.tsx — see the comment there.
    // Timeline pins are per-element, so a long list mounts many of these. Skip
    // the forced layout when nothing that feeds the maths has moved.
    //
    // The key has to include viewport height, not just scroll height: on iOS the
    // toolbar collapses and expands mid-scroll, which changes maxScroll while the
    // document height stays put. Keying on scrollHeight alone left --pin-distance
    // stale, so the translate rate no longer matched the scroll range and the
    // pinned element visibly drifted down. Desktop never hits this.
    let measuredAt = "";

    const measureTimeline = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const key = `${scrollHeight}x${Math.round(viewportHeight)}`;

      if (key === measuredAt) return;
      measuredAt = key;

      element.style.animation = "none";
      const naturalTop = element.getBoundingClientRect().top + window.scrollY;
      element.style.animation = "";

      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const pinStart = Math.max(0, naturalTop - offset);
      const distance =
        releaseAfter === undefined
          ? Math.max(0, maxScroll - pinStart)
          : Math.min(releaseAfter, Math.max(0, maxScroll - pinStart));

      element.style.setProperty("--pin-start", `${pinStart}px`);
      element.style.setProperty("--pin-distance", `${distance}px`);
      // Once the range ends the animation holds translateY(distance), a constant,
      // so the element resumes scrolling with the page instead of staying stuck.
      element.style.setProperty("--pin-end", `${pinStart + distance}px`);
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
      // iOS reports the toolbar collapsing as a visualViewport resize, and often
      // not as a window resize — without this the stale maths is never refreshed.
      const viewport = window.visualViewport;
      viewport?.addEventListener("resize", measureTimeline);

      return () => {
        observer.disconnect();
        window.removeEventListener("resize", measureTimeline);
        viewport?.removeEventListener("resize", measureTimeline);
        delete element.dataset.pinned;
      };
    }

    delete element.dataset.pinned;
    element.style.removeProperty("--pin-start");
    element.style.removeProperty("--pin-distance");
    element.style.removeProperty("--pin-end");

    // Fallback: drive the same transform from JS. Derived from
    // getBoundingClientRect, which is already relative to the visible viewport —
    // window.scrollY tracks the layout viewport, which drifts from what the user
    // sees by the height of Safari's collapsing toolbar. Subtracting the last
    // applied transform recovers the natural position, so this self-corrects.
    let applied = 0;

    const apply = () => {
      const naturalTop = element.getBoundingClientRect().top - applied;
      const wanted = Math.max(0, offset - naturalTop);
      const next =
        releaseAfter === undefined ? wanted : Math.min(wanted, releaseAfter);

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
  }, [offset, releaseAfter]);

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}
