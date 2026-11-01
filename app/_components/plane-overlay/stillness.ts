"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function asksForStillness() {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

export function useStillness() {
  return useSyncExternalStore(
    (changed) => {
      const query = window.matchMedia(QUERY);
      query.addEventListener("change", changed);
      return () => query.removeEventListener("change", changed);
    },
    asksForStillness,
    () => false,
  );
}
