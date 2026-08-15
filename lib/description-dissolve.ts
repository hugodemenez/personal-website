export interface InkParticle {
  a: number;
  b: number;
  delay: number;
  g: number;
  jx: number;
  jy: number;
  r: number;
  x: number;
  y: number;
}

export const DISSOLVE_MS = 640;
export const BODY_RESOLVE_DELAY_MS = 280;
const MAX_PARTICLES = 2200;

function unitHash(x: number, y: number, salt: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(salt, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/**
 * Break a description into lines the way a CSS block would, using a measure
 * callback so this can run in tests without a canvas.
 */
export function wrapDescriptionLines(
  text: string,
  maxWidth: number,
  measure: (value: string) => number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
}

/**
 * Keep only inked pixels, stepping through the bitmap so a paragraph stays
 * under a few thousand points on a phone.
 */
export function sampleInkParticles(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  step = 2
): InkParticle[] {
  let stride = Math.max(1, step);
  let particles = collect(data, width, height, stride);

  while (particles.length > MAX_PARTICLES && stride < 8) {
    stride += 1;
    particles = collect(data, width, height, stride);
  }

  return particles;
}

function collect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  step: number
): InkParticle[] {
  const particles: InkParticle[] = [];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3] ?? 0;
      if (alpha < 40) continue;

      particles.push({
        a: alpha / 255,
        b: (data[index + 2] ?? 0) / 255,
        delay: unitHash(x, y, 2) * 0.34,
        g: (data[index + 1] ?? 0) / 255,
        jx: unitHash(x, y, 0) * 2 - 1,
        jy: unitHash(x, y, 1) * 2 - 1,
        r: (data[index] ?? 0) / 255,
        x,
        y,
      });
    }
  }

  return particles;
}
