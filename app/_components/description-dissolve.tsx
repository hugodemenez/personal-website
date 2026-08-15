"use client";

import { useEffect, useRef, useState } from "react";
import {
  DISSOLVE_MS,
  sampleInkParticles,
  wrapDescriptionLines,
  type InkParticle,
} from "@/lib/description-dissolve";

interface Burst {
  color: string;
  dpr: number;
  font: string;
  height: number;
  left: number;
  lineHeight: number;
  particles: InkParticle[];
  top: number;
  width: number;
}

type Listener = (burst: Burst | null) => void;

let current: Burst | null = null;
const listeners = new Set<Listener>();

function publish(burst: Burst | null) {
  current = burst;
  for (const listener of listeners) listener(burst);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function paintDescription(element: HTMLElement): Burst | null {
  const text = element.innerText.trim();
  if (!text) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return null;

  const styles = getComputedStyle(element);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const font = styles.font;
  const lineHeight =
    Number.parseFloat(styles.lineHeight) ||
    Number.parseFloat(styles.fontSize) * 1.5;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.font = font;
  const lines = wrapDescriptionLines(text, rect.width, (value) =>
    context.measureText(value).width
  );
  const height = Math.max(rect.height, lines.length * lineHeight);
  canvas.width = Math.max(1, Math.ceil(rect.width * dpr));
  canvas.height = Math.max(1, Math.ceil(height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, rect.width, height);
  context.font = font;
  context.fillStyle = styles.color;
  context.textBaseline = "top";
  lines.forEach((line, index) => {
    context.fillText(line, 0, index * lineHeight);
  });

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const particles = sampleInkParticles(
    image.data,
    image.width,
    image.height,
    Math.max(2, Math.round(dpr * 2))
  );
  if (!particles.length) return null;

  return {
    color: styles.color,
    dpr,
    font,
    height: canvas.height / dpr,
    left: rect.left,
    lineHeight,
    particles,
    top: rect.top,
    width: canvas.width / dpr,
  };
}

/**
 * Snapshot the list excerpt and hide it so the overlay is the only copy
 * once navigation starts.
 */
export function armDescriptionDissolve(element: HTMLElement | null) {
  if (!element || prefersReducedMotion()) return;

  const burst = paintDescription(element);
  if (!burst) return;

  element.style.visibility = "hidden";
  publish(burst);
}

function useBurst() {
  const [burst, setBurst] = useState<Burst | null>(current);

  useEffect(() => {
    listeners.add(setBurst);
    return () => {
      listeners.delete(setBurst);
    };
  }, []);

  return burst;
}

function playBurst(
  canvas: HTMLCanvasElement,
  burst: Burst,
  onDone: () => void
): () => void {
  const context = canvas.getContext("2d");
  if (!context) {
    onDone();
    return () => {};
  }

  const started = performance.now();
  let frame = 0;
  let cancelled = false;

  const resize = () => {
    const nextDpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * nextDpr);
    canvas.height = Math.floor(window.innerHeight * nextDpr);
    context.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
  };

  resize();

  const tick = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - started) / DISSOLVE_MS);
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const particle of burst.particles) {
      const local = Math.min(
        1,
        Math.max(0, (t - particle.delay) / Math.max(0.001, 1 - particle.delay))
      );
      const ease = local * local * (3 - 2 * local);
      const x = burst.left + particle.x / burst.dpr + particle.jx * 26 * ease;
      const y =
        burst.top + particle.y / burst.dpr + (32 + particle.jy * 22) * ease;
      context.globalAlpha = particle.a * (1 - ease);
      context.fillStyle = `rgb(${Math.round(particle.r * 255)} ${Math.round(
        particle.g * 255
      )} ${Math.round(particle.b * 255)})`;
      context.beginPath();
      context.arc(x, y, Math.max(0.45, 1.35 * (1 - ease * 0.65)), 0, Math.PI * 2);
      context.fill();
    }

    if (t < 1) {
      frame = window.requestAnimationFrame(tick);
      return;
    }
    onDone();
  };

  frame = window.requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(frame);
  };
}

/**
 * Lives in the root layout so the dust can keep moving after the list unmounts.
 */
export function DescriptionDissolveHost() {
  const burst = useBurst();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !burst) return;
    return playBurst(canvas, burst, () => publish(null));
  }, [burst]);

  if (!burst) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
      style={{ viewTransitionName: "description-dissolve" }}
    />
  );
}
