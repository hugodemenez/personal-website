// Pure flywheel geometry in the wheel's own plane (u = world y, v = world z up), centre at (0,0).
export type XY = [number, number];

export const W = {
  rimOut: 70,
  rimIn: 60,
  web: 58,
  hub: 18,
  spokes: [90, 157.5, 225, 292.5, 360],
  sector: [0, 90],
  crank: 14,
  rod: 112,
  railZ: -60,
};

export type Linkage = {
  pin: XY;
  slide: number;
  end: XY;
};

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (r: number, a: number): XY => [r * Math.cos(a), r * Math.sin(a)];
const f = (n: number) => Math.round(n * 100) / 100;
const poly = (pts: XY[]) => "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";

export const circle = (r: number, cx = 0, cy = 0, n = 96) =>
  poly(
    Array.from({ length: n }, (_, i) => [
      cx + r * Math.cos((i / n) * 2 * Math.PI),
      cy + r * Math.sin((i / n) * 2 * Math.PI),
    ]),
  );

export const bend = (phi: number, r: number) =>
  rad(phi) + 0.3 * Math.sin((Math.PI * (r - W.hub)) / (W.web - W.hub));

const half = (r: number) => 2.6 + 5 * (Math.exp(-(r - W.hub) / 4) + Math.exp(-(W.web - r) / 4));

function windowOf(a: number, b: number) {
  const n = 40,
    left: XY[] = [],
    right: XY[] = [];
  for (let i = 0; i <= n; i++) {
    const r = W.hub + 0.6 + (W.web - W.hub - 1.2) * (i / n);
    left.push(pt(r, bend(a, r) + half(r) / r));
    right.push(pt(r, bend(b, r) - half(r) / r));
  }
  const outer: XY[] = [],
    a1 = bend(a, W.web) + half(W.web) / W.web,
    b1 = bend(b, W.web) - half(W.web) / W.web;
  for (let i = 1; i < 16; i++) outer.push(pt(W.web - 0.6, a1 + (b1 - a1) * (i / 16)));
  return poly([...left, ...outer, ...right.reverse()]);
}

export function web() {
  const s = W.spokes,
    holes: string[] = [];
  for (let i = 0; i < s.length - 1; i++) holes.push(windowOf(s[i], s[i + 1]));
  return { fill: circle(W.rimIn + 0.5) + holes.join(""), holes };
}

export const ribs = () =>
  W.spokes.map((phi) =>
    poly(
      Array.from({ length: 30 }, (_, i) => {
        const r = W.hub + 1 + (W.web - W.hub - 2) * (i / 29);
        return pt(r, bend(phi, r));
      }),
    ).replace(/Z$/, ""),
  );

export function sectorPanel() {
  const a = bend(0, 30) + 0.28,
    b = rad(90) - 0.28,
    pts: XY[] = [];
  for (let i = 0; i <= 24; i++) pts.push(pt(52, a + ((b - a) * i) / 24));
  for (let i = 24; i >= 0; i--) pts.push(pt(28, a + ((b - a) * i) / 24));
  return poly(pts);
}

export const sectorBolts = () => [20, 45, 70].map((d) => pt(40, rad(d)));
export const hubBolts = () => Array.from({ length: 6 }, (_, i) => pt(11.5, (i * Math.PI) / 3));

export function pinion(r = 11, teeth = 16) {
  const pts: XY[] = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * 2 * Math.PI;
    pts.push(pt(i % 4 < 2 ? r : r - 2.2, a + (i % 4 === 1 || i % 4 === 3 ? 0 : 0.02)));
  }
  return poly(pts);
}

// angle in degrees, clockwise as the operator sees it (positive SVG rotate in this plane)
export function linkage(deg: number): Linkage {
  const a = rad(deg),
    pin = pt(W.crank, a);
  const dz = pin[1] - W.railZ;
  const slide = pin[0] - Math.sqrt(W.rod * W.rod - dz * dz);
  return { pin, slide, end: [slide, W.railZ] };
}

export function rodPath({ pin, end }: Pick<Linkage, "pin" | "end">, w = 3) {
  const dx = end[0] - pin[0],
    dy = end[1] - pin[1],
    L = Math.hypot(dx, dy),
    nx = (-dy / L) * w,
    ny = (dx / L) * w;
  return (
    poly([
      [pin[0] + nx, pin[1] + ny],
      [end[0] + nx, end[1] + ny],
      [end[0] - nx, end[1] - ny],
      [pin[0] - nx, pin[1] - ny],
    ]) +
    circle(5, pin[0], pin[1], 24) +
    circle(5, end[0], end[1], 24)
  );
}
