"use client";

import { useEffect, useState } from "react";
import { fadingPresence, STAMP_FADE_MS } from "@/lib/stamp-visibility";

/**
 * Keep keys for a short fade after they leave `active`, then drop them so
 * the caller can unmount.
 */
export function useFadingPresence(active: string[], fadeMs = STAMP_FADE_MS) {
  const [presence, setPresence] = useState<Map<string, number>>(
    () => new Map(active.map((key) => [key, 0]))
  );

  useEffect(() => {
    const now = Date.now();
    let next = fadingPresence(presence, active, now, fadeMs);
    const same =
      next.size === presence.size &&
      [...next].every(([key, until]) => presence.get(key) === until);

    if (!same) setPresence(next);
    else next = presence;

    const remaining = [...next.values()].filter((until) => until > 0);
    if (!remaining.length) return;

    const timeout = window.setTimeout(
      () => {
        setPresence((current) => fadingPresence(current, active, Date.now(), fadeMs));
      },
      Math.max(16, Math.min(...remaining) - now)
    );

    return () => window.clearTimeout(timeout);
    // presence is read at effect time; feeding it back would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.join("|"), fadeMs]);

  return {
    fading: (key: string) => (presence.get(key) ?? 0) > 0,
    keys: [...presence.keys()],
  };
}
