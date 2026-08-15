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

const VERTEX = `
attribute vec2 aOrigin;
attribute vec2 aJitter;
attribute vec4 aColor;
attribute float aDelay;
uniform vec2 uResolution;
uniform float uProgress;
uniform float uDpr;
varying vec4 vColor;

void main() {
  float t = clamp((uProgress - aDelay) / max(0.001, 1.0 - aDelay), 0.0, 1.0);
  float ease = t * t * (3.0 - 2.0 * t);
  vec2 drift = vec2(aJitter.x * 26.0, 32.0 + aJitter.y * 22.0) * ease;
  vec2 pos = aOrigin + drift;
  vec2 clip = (pos / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = max(0.6, mix(2.15, 0.35, ease) * uDpr);
  vColor = vec4(aColor.rgb, aColor.a * (1.0 - ease));
}
`;

const FRAGMENT = `
precision mediump float;
varying vec4 vColor;

void main() {
  vec2 centered = gl_PointCoord * 2.0 - 1.0;
  float falloff = 1.0 - clamp(dot(centered, centered), 0.0, 1.0);
  if (falloff <= 0.0) discard;
  gl_FragColor = vec4(vColor.rgb, vColor.a * falloff);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function playBurst(
  canvas: HTMLCanvasElement,
  burst: Burst,
  onDone: () => void
): () => void {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: false,
  });
  if (!gl) {
    onDone();
    return () => {};
  }

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    onDone();
    return () => {};
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    onDone();
    return () => {};
  }

  const count = burst.particles.length;
  const origins = new Float32Array(count * 2);
  const jitters = new Float32Array(count * 2);
  const colors = new Float32Array(count * 4);
  const delays = new Float32Array(count);

  burst.particles.forEach((particle, index) => {
    origins[index * 2] = burst.left + particle.x / burst.dpr;
    origins[index * 2 + 1] = burst.top + particle.y / burst.dpr;
    jitters[index * 2] = particle.jx;
    jitters[index * 2 + 1] = particle.jy;
    colors[index * 4] = particle.r;
    colors[index * 4 + 1] = particle.g;
    colors[index * 4 + 2] = particle.b;
    colors[index * 4 + 3] = particle.a;
    delays[index] = particle.delay;
  });

  const bind = (name: string, data: Float32Array, size: number) => {
    const buffer = gl.createBuffer();
    const location = gl.getAttribLocation(program, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  };

  gl.useProgram(program);
  bind("aOrigin", origins, 2);
  bind("aJitter", jitters, 2);
  bind("aColor", colors, 4);
  bind("aDelay", delays, 1);

  const resolution = gl.getUniformLocation(program, "uResolution");
  const progress = gl.getUniformLocation(program, "uProgress");
  const dpr = gl.getUniformLocation(program, "uDpr");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const started = performance.now();
  let frame = 0;
  let cancelled = false;

  const resize = () => {
    const nextDpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * nextDpr);
    canvas.height = Math.floor(window.innerHeight * nextDpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolution, window.innerWidth, window.innerHeight);
    gl.uniform1f(dpr, nextDpr);
  };

  resize();

  const tick = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - started) / DISSOLVE_MS);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(progress, t);
    gl.drawArrays(gl.POINTS, 0, count);
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
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
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
