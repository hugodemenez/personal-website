import { createRandom } from "./seeded-random";

export type StampAlign = "start" | "center" | "end";

export interface StampPose {
  align: StampAlign;
  /** Perforation pitch, in px — slightly different tooth spacing per stamp. */
  pitch: number;
  /** Rotation in degrees. */
  rotate: number;
  /** Horizontal nudge in px. */
  shiftX: number;
  /** Vertical nudge in px. */
  shiftY: number;
  /** Width as a fraction of the host (0–1). */
  width: number;
}

/**
 * A stable, slightly messy placement for one stamp. The same seed always
 * returns the same pose, so a post does not wander between renders.
 */
export function getStampPose(
  seed: string,
  variant: "collectible" | "feature" = "collectible"
): StampPose {
  const random = createRandom(seed);
  const alignRoll = random();
  const collectible = variant === "collectible";

  return {
    align: alignRoll < 0.34 ? "start" : alignRoll < 0.67 ? "end" : "center",
    pitch: 11 + random() * 2.4,
    rotate: (random() - 0.5) * (collectible ? 14 : 8),
    shiftX: (random() - 0.5) * (collectible ? 18 : 10),
    shiftY: (random() - 0.5) * (collectible ? 10 : 6),
    width: collectible ? 0.72 + random() * 0.16 : 0.9 + random() * 0.08,
  };
}
