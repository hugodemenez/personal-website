"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Paints the article blurred and slightly low, then lets it settle. The first
 * frame has to stay pending so the CSS transition has a from-state.
 */
export function PostBodyReveal({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReady(true);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={ready ? "post-body-resolve" : "post-body-pending"}>
      {children}
    </div>
  );
}
