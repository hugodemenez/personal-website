import { RESUME_PLACES, type ResumePlace } from "@/lib/resume-places";

export interface ResumeListItem {
  detail: string;
  key: string;
  title: string;
}

/** Pause after a resume stroke finishes so the row can be read before the next. */
export const RESUME_HOLD_MS = 1100;
/** Hide the previous stroke before the next dashoffset transition can run. */
export const RESUME_RESTART_MS = 40;

export function resumeListItems(
  places: readonly ResumePlace[] = RESUME_PLACES
): ResumeListItem[] {
  return places
    .filter((place) => place.detail.trim().length > 0)
    .map((place) => ({
      detail: place.detail,
      key: place.label,
      title: place.title,
    }));
}

export function resumeLoopKeys(
  places: readonly ResumePlace[] = RESUME_PLACES
): string[] {
  return resumeListItems(places).map((item) => item.key);
}

export function isResumeLoopKey(
  label: string,
  keys: readonly string[] = resumeLoopKeys()
): boolean {
  return keys.includes(label);
}

/**
 * Advance through a stable resume list. `index` of `-1` (nothing playing)
 * starts at the first item; the last item wraps to the first.
 */
export function nextResumeIndex(count: number, index: number): number {
  if (count <= 0) return 0;
  if (!Number.isFinite(index) || index < 0) return 0;
  return (index + 1) % count;
}

export function resumeLoopStepMs(drawMs: number): number {
  return RESUME_RESTART_MS + drawMs + RESUME_HOLD_MS;
}
