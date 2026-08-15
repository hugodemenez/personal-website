"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BODY_RESOLVE_DELAY_MS } from "@/lib/description-dissolve";

/**
 * Holds the article just off-stage, then lets it settle after the excerpt
 * has started dissolving. Reduced motion skips the wait.
 */
export function PostBodyReveal({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReady(true);
      return;
    }

    const timeout = window.setTimeout(() => setReady(true), BODY_RESOLVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className={ready ? "post-body-resolve" : "post-body-pending"}>
      {children}
    </div>
  );
}
