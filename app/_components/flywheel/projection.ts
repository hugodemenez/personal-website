// Minimal Anatomy iso projection — only what live motion needs (iso + translateAlong).
export type Flat = [number, number];
export type Point3 = [number, number, number];

export type Projection = {
  origin: Flat;
  scale: number;
  azimuth?: number;
  elevation?: number;
};

// Baked by v2 `node build.mjs` (fitProjection, viewBox 640×460, azimuth 38 / elevation 30).
export const P: Projection = {
  origin: [358.06721646768835, 332.705961872158],
  scale: 1.2690209618395607,
  azimuth: 38,
  elevation: 30,
};

export const H0: Point3 = [0, 47, 0];

const RADIANS = Math.PI / 180;
const UNIT = Math.sqrt(1.6);
const AZIMUTH = 45;
const ELEVATION = 30;

export function cameraOf({ scale, azimuth = AZIMUTH, elevation = ELEVATION }: Projection) {
  const a = azimuth * RADIANS;
  const e = elevation * RADIANS;
  return {
    sinA: Math.sin(a),
    cosA: Math.cos(a),
    sinE: Math.sin(e),
    cosE: Math.cos(e),
    k: scale * UNIT,
  };
}

export function iso([x, y, z]: Point3, projection: Projection): Flat {
  const { origin } = projection;
  const { sinA, cosA, sinE, cosE, k } = cameraOf(projection);
  return [
    origin[0] + (x * sinA - y * cosA) * k,
    origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k,
  ];
}

export function axisVector(projection: Projection, [dx, dy, dz]: Point3): Flat {
  const origin = iso([0, 0, 0], projection);
  const moved = iso([dx, dy, dz], projection);
  return [moved[0] - origin[0], moved[1] - origin[1]];
}

const fine = (value: number) => Math.round(value * 100) / 100;

export function translateAlong(projection: Projection, by: Point3) {
  const [x, y] = axisVector(projection, by);
  return `translate(${fine(x)} ${fine(y)})`;
}
