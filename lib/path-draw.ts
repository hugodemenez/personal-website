export const DRAW_MS = 1000;
export const INSTANT_VISIBLE_RATIO = 1 / 3;

export function shouldRevealImmediately(intersectionRatio: number): boolean {
  return intersectionRatio >= INSTANT_VISIBLE_RATIO;
}
