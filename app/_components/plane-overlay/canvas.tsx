"use client";

import { useEffect, useRef } from "react";
import { useStillness } from "./stillness";
import { mountPlaneScene } from "./scene";

export function PlaneCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const still = useStillness();
  const stillRef = useRef(still);
  stillRef.current = still;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const scene = mountPlaneScene(canvas, stillRef, host);
    return () => {
      scene.dispose();
      if (canvas.parentElement !== host) host.appendChild(canvas);
    };
  }, []);

  return (
    <div ref={hostRef} className="plane-overlay-host" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="plane-overlay"
        data-flight="flight"
        aria-hidden="true"
      />
    </div>
  );
}
