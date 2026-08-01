"use client";

import { useEffect, useState } from "react";

/**
 * Solid strip in the band iOS Safari samples to tint its chrome. The CSS alone
 * tracks the theme, but Safari reads the color once and will not re-read it
 * when the system appearance changes, leaving the old tint until a reload.
 * Remounting the strip gives it a fresh node to sample.
 */
export function SafariThemeSampler() {
  const [scheme, setScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setScheme(query.matches ? "dark" : "light");

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <span
      key={`safari-theme-top-${scheme}`}
      className="safari-theme-sampler"
      aria-hidden="true"
    />
  );
}
