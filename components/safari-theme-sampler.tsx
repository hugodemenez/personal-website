"use client";

import { useEffect, useState } from "react";

type ColorScheme = "dark" | "light" | "system";

export function SafariThemeSampler() {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("system");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateColorScheme = () =>
      setColorScheme(mediaQuery.matches ? "dark" : "light");

    updateColorScheme();
    mediaQuery.addEventListener("change", updateColorScheme);
    return () => mediaQuery.removeEventListener("change", updateColorScheme);
  }, []);

  return (
    <span
      key={`safari-theme-${colorScheme}`}
      aria-hidden="true"
      className="safari-theme-sampler"
    />
  );
}
