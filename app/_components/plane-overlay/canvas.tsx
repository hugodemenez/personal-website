"use client";

import { useEffect, useRef } from "react";
import { useStillness } from "./stillness";
import { mountPlaneScene } from "./scene";

export function PlaneCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const still = useStillness();
  const stillRef = useRef(still);
  stillRef.current = still;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = mountPlaneScene(canvas, stillRef);
    return () => scene.dispose();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="plane-overlay"
      data-flight="flight"
      aria-hidden="true"
    />
  );
}
