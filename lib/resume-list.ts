import { RESUME_PLACES, type ResumePlace } from "@/lib/resume-places";

export interface ResumeListItem {
  detail: string;
  key: string;
  title: string;
}

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

export function orderResumeList<T extends { key: string }>(
  items: readonly T[],
  selectedKey: string | null
): T[] {
  if (!selectedKey) return [...items];

  const selected: T[] = [];
  const rest: T[] = [];

  for (const item of items) {
    if (item.key === selectedKey) selected.push(item);
    else rest.push(item);
  }

  return [...selected, ...rest];
}
