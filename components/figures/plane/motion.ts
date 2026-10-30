import { iso, type Projection } from "@/components/iso/iso-kit";

export const NOSE = 62;
export const PROP_R = 17;
// Shortened from 92 so the figure fits a ~120px strip without clipping the tips.
export const SPAN = 75;
export const VIEW_WIDTH = 520;
export const VIEW_HEIGHT = 160;
export const STILL_BLADE_ANGLE = 0.6;

export function bladePath(angle: number, projection: Projection) {
  const s = Math.sin(angle) * PROP_R;
  const c = Math.cos(angle) * PROP_R;
  const p = iso([NOSE + 3, s, 22 + c], projection);
  const q = iso([NOSE + 3, -s, 22 - c], projection);
  return `M${p[0].toFixed(2)} ${p[1].toFixed(2)}L${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
}

export function hubPoint(projection: Projection) {
  return iso([NOSE + 3, 0, 22], projection);
}
