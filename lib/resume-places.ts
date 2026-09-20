/**
 * Geographic beats from `app/posts/cv/page.mdx`, plus Foundever (global).
 * Circles on the map and the resume list under it share `label` as the key.
 */
export interface ResumePlace {
  country: string | null;
  detail: string;
  label: string;
  latitude: number;
  longitude: number;
  span: "city" | "region" | "global";
  title: string;
}

export const RESUME_PLACES: readonly ResumePlace[] = [
  {
    country: "France",
    detail: "Engineering degree · Lille, quantitative finance",
    label: "France",
    latitude: 50.63,
    longitude: 3.06,
    span: "region",
    title: "ISEN",
  },
  {
    country: "Portugal",
    detail: "Fullstack developer, 2022",
    label: "Portugal",
    latitude: 41.15,
    longitude: -8.61,
    span: "city",
    title: "Cofidis",
  },
  {
    country: "United States",
    detail: "Design thinking and innovation",
    label: "Harvard",
    latitude: 42.37,
    longitude: -71.12,
    span: "city",
    title: "Harvard Business School Online",
  },
  {
    country: null,
    detail: "Globally",
    label: "Foundever",
    latitude: 12,
    longitude: -28,
    span: "global",
    title: "Foundever",
  },
];
