import type { AlbumSlot } from "./stamp-album";

/** Title stamps mounted around the current post — enough to scroll into. */
export const TITLE_STAMP_WINDOW = 4;

/**
 * Buried album stamps under the pile. The row stays; only the top of the
 * stack is worth keeping on screen.
 */
export const ALBUM_PILE_VISIBLE = 10;

export const STAMP_FADE_MS = 180;

/** A stamp sits beside its title until that post has been scrolled past. */
export function isStampCollected(
  postIndex: number,
  selectedIndex: number
): boolean {
  return postIndex < selectedIndex;
}

/**
 * Title-side stamps for the current post and a few still ahead. Past posts
 * live in the album; far-ahead ones remount as we scroll down to them.
 */
export function isTitleStampActive(
  postIndex: number,
  selectedIndex: number
): boolean {
  return (
    !isStampCollected(postIndex, selectedIndex) &&
    postIndex <= selectedIndex + TITLE_STAMP_WINDOW
  );
}

/**
 * Seeds that should stay mounted in the album: every stamp still on the row,
 * plus the most recent stamps in the pile.
 */
export function albumMountSeeds(
  slots: Array<Pick<AlbumSlot, "stacked">>,
  seeds: string[]
): string[] {
  const row: string[] = [];
  const stacked: string[] = [];

  slots.forEach((slot, index) => {
    const seed = seeds[index];
    if (!seed) return;
    if (slot.stacked) stacked.push(seed);
    else row.push(seed);
  });

  return [...row, ...stacked.slice(-ALBUM_PILE_VISIBLE)];
}

/**
 * Keep departing keys for `fadeMs` so a fade-out can finish before unmount.
 * `now` is injected so the fade window is testable.
 */
export function fadingPresence(
  previous: Map<string, number>,
  active: Iterable<string>,
  now: number,
  fadeMs: number
): Map<string, number> {
  const activeSet = new Set(active);
  const next = new Map<string, number>();

  for (const key of activeSet) {
    next.set(key, 0);
  }

  for (const [key, until] of previous) {
    if (activeSet.has(key)) continue;
    const deadline = until === 0 ? now + fadeMs : until;
    if (deadline > now) next.set(key, deadline);
  }

  return next;
}
