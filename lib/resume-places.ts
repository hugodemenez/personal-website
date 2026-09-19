/**
 * Geographic beats from `app/posts/cv/page.mdx`, plus Foundever (global).
 * The homepage does not list the CV; these marks sit on the map and only
 * speak when a scribble is hovered or tapped.
 */
export interface ResumePlace {
  country: string | null;
  detail: string;
  label: string;
  latitude: number;
  longitude: number;
  span: "city" | "region" | "global";
}

export const RESUME_PLACES: readonly ResumePlace[] = [
  {
    country: "France",
    detail: "ISEN · engineering degree · Lille, quantitative finance",
    label: "France",
    latitude: 50.63,
    longitude: 3.06,
    span: "region",
  },
  {
    country: "Portugal",
    detail: "Cofidis · fullstack, 2022",
    label: "Portugal",
    latitude: 41.15,
    longitude: -8.61,
    span: "city",
  },
  {
    country: "United States",
    detail: "Business School Online · design thinking",
    label: "Harvard",
    latitude: 42.37,
    longitude: -71.12,
    span: "city",
  },
  {
    country: null,
    detail: "Globally",
    label: "Foundever",
    latitude: 12,
    longitude: -28,
    span: "global",
  },
];
