export const DRAW_MS = 2500;
export const DRAW_VISIBLE_RATIO = 1 / 3;

export function shouldStartDraw(intersectionRatio: number): boolean {
  return intersectionRatio >= DRAW_VISIBLE_RATIO;
}
