// Berkel volano v2 — pure geometry & kinematics (no deps). World: x = carriage travel = flywheel axle, y = depth (blade at back, -y), z = up.
export type XY = [number, number];

export const W = {
  rimOut: 56,
  band: 41,
  ring: 37,
  hub: 9,
  petals: 4,
  centre: [74, 18, 30] as [number, number, number],
  crankC: [-6, 24] as XY,
  crank: 12,
  pivot: [-52, 6] as XY,
  arm: 27,
  lever: 64,
  rod: 46,
  ratio: 3,
  blade: { x: -38, z: 116, y: -40, r: 54 },
};

export type Linkage = {
  pin: XY;
  eye: XY;
  top: XY;
  th: number;
  slide: number;
};

const rad = (d: number) => (d * Math.PI) / 180;
export const pt = (r: number, a: number): XY => [r * Math.cos(a), r * Math.sin(a)];
const f = (n: number) => Math.round(n * 100) / 100;
export const poly = (pts: XY[], close = true) =>
  "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + (close ? "Z" : "");
export const circle = (r: number, cx = 0, cy = 0, n = 96) =>
  poly(Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)]));
export const ringPath = (r0: number, r1: number, n = 120) =>
  circle(r1, 0, 0, n) + poly(Array.from({ length: n }, (_, i) => pt(r0, -(i / n) * 2 * Math.PI)));

function petalOutline(phi: number, r0: number, r1: number, spread: number, k = 60) {
  const pts: XY[] = [];
  for (let i = 0; i <= k; i++) {
    const t = i / k,
      a = Math.PI * 2 * t;
    const r = r0 + (r1 - r0) * (0.5 - 0.5 * Math.cos(a));
    const w = spread * Math.sin(a) * (0.55 + 0.45 * Math.sin((Math.PI * (r - r0)) / (r1 - r0)));
    pts.push(pt(r, phi + w));
  }
  return pts;
}

export function petals() {
  const out: string[] = [];
  for (let i = 0; i < W.petals; i++) {
    const phi = rad(45 + i * 90);
    const outer = petalOutline(phi, W.hub - 1, W.ring + 0.5, 0.62);
    const inner = petalOutline(phi, W.hub + 6, W.ring - 4, 0.42).reverse();
    out.push(poly(outer) + poly(inner));
  }
  return out;
}

export const hubBolts = () => Array.from({ length: 4 }, (_, i) => pt(5.5, rad(i * 90)));

export function gear(r = 14, teeth = 22, depth = 2) {
  const pts: XY[] = [];
  for (let i = 0; i < teeth * 4; i++) {
    pts.push(pt(i % 4 < 2 ? r : r - depth, ((i + (i % 4 === 1 || i % 4 === 3 ? 0 : 0.15)) / (teeth * 4)) * 2 * Math.PI));
  }
  return poly(pts);
}

export const bladeBolts = () => [0, 120, 240].map((d) => pt(9, rad(d)));

export function slice(rx: number, ry: number, seed = 0, n = 64) {
  const pts: XY[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI,
      w = 1 + 0.06 * Math.sin(5 * a + seed) + 0.04 * Math.sin(9 * a + 2 * seed);
    pts.push([rx * w * Math.cos(a), ry * w * Math.sin(a)]);
  }
  return poly(pts);
}

export function linkage(deg: number): Linkage {
  const a = rad(-deg),
    [cx, cz] = W.crankC,
    pin: XY = [cx + W.crank * Math.cos(a), cz + W.crank * Math.sin(a)];
  const [ox, oz] = W.pivot;
  const err = (th: number) =>
    Math.hypot(ox + W.arm * Math.sin(th) - pin[0], oz + W.arm * Math.cos(th) - pin[1]) - W.rod;
  let lo = -1.2,
    hi = 1.2;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    (err(lo) < 0) === (err(m) < 0) ? (lo = m) : (hi = m);
  }
  const th = (lo + hi) / 2;
  const eye: XY = [ox + W.arm * Math.sin(th), oz + W.arm * Math.cos(th)];
  const top: XY = [ox + W.lever * Math.sin(th), oz + W.lever * Math.cos(th)];
  return { pin, eye, top, th, slide: top[0] - ox };
}

const bar = (a: XY, b: XY, w: number) => {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    L = Math.hypot(dx, dy),
    nx = (-dy / L) * w,
    ny = (dx / L) * w;
  return poly([
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ]);
};

export const rodPath = (l: Linkage) =>
  bar(l.pin, l.eye, 2.6) + circle(4.4, l.pin[0], l.pin[1], 24) + circle(4.4, l.eye[0], l.eye[1], 24);
export const leverPath = (l: Linkage) =>
  bar(W.pivot, l.top, 3.4) + circle(6, W.pivot[0], W.pivot[1], 28) + circle(4.6, l.top[0], l.top[1], 24);

export const slicePhase = (deg: number) => {
  const t = (((deg % 360) + 360) % 360) / 360;
  return t;
};
