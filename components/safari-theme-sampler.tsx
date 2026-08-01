"use client";

import { useEffect, useRef } from "react";

/**
 * Solid strip in the band iOS Safari samples to tint its chrome. The CSS alone
 * tracks the theme, but Safari reads the color once and caches it, so toggling
 * the system appearance leaves the old tint until a reload. Repainting the
 * strip on the change makes Safari read it again.
 */
export function SafariThemeSampler() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");

    const resample = () => {
      const el = ref.current;
      if (!el) return;

      // Pin the new color explicitly rather than waiting for the cascade, then
      // drop the strip out of flow and back to force a fresh paint of the band.
      const background = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim();
      if (background) el.style.backgroundColor = background;

      el.style.display = "none";
      void el.offsetHeight;
      el.style.display = "";
    };

    query.addEventListener("change", resample);
    return () => query.removeEventListener("change", resample);
  }, []);

  return <span ref={ref} className="safari-theme-sampler" aria-hidden="true" />;
}
