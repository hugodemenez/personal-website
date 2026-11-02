/**
 * Homepage Places: table copy plus map marks.
 * Shake-approved wording lives here so it can change without JSX edits.
 * Map geography is the previous Places marks; EDH has no map location.
 */
export const RESUME_PLACES_TITLE = "Places";

export const RESUME_PLACE_COLUMNS = [
  { key: "place", header: "Place" },
  { key: "role", header: "Role" },
  { key: "what", header: "What" },
  { key: "year", header: "Year" },
] as const;

export type ResumePlaceField = (typeof RESUME_PLACE_COLUMNS)[number]["key"];
export type ResumePlaceSpan = "city" | "region" | "global";

export interface ResumePlace {
  place: string;
  role: string;
  what: string;
  year: string;
  /** Stable key for the map loop and table highlight. */
  label: string;
  country?: string | null;
  latitude?: number;
  longitude?: number;
  span?: ResumePlaceSpan;
}

export type MappedResumePlace = ResumePlace & {
  latitude: number;
  longitude: number;
  span: ResumePlaceSpan;
};

export function isMappedResumePlace(
  place: ResumePlace
): place is MappedResumePlace {
  return (
    place.span != null &&
    place.latitude != null &&
    Number.isFinite(place.latitude) &&
    place.longitude != null &&
    Number.isFinite(place.longitude)
  );
}

export const RESUME_PLACES: readonly ResumePlace[] = [
  {
    place: "ISEN",
    role: "Engineering degree",
    what: "Computer science and quantitative finance, Lille",
    year: "2018-2023",
    label: "France",
    country: "France",
    latitude: 50.63,
    longitude: 3.06,
    span: "region",
  },
  {
    place: "Cofidis",
    role: "Fullstack developer",
    what: "Fraud detection and customer chatbot, Lisbon",
    year: "2022",
    label: "Portugal",
    country: "Portugal",
    latitude: 41.15,
    longitude: -8.61,
    span: "city",
  },
  {
    place: "Harvard Business School Online",
    role: "Certificate",
    what: "Design thinking and innovation",
    year: "2023",
    label: "Harvard",
    country: "United States",
    latitude: 42.37,
    longitude: -71.12,
    span: "city",
  },
  {
    place: "Foundever",
    role: "Backend engineer",
    what: "Global",
    year: "Present",
    label: "Foundever",
    country: null,
    latitude: 12,
    longitude: -28,
    span: "global",
  },
  {
    place: "EDH with Rothschild & Co",
    role: "BI analytics",
    what: "Business intelligence collaboration",
    year: "—",
    label: "EDH",
  },
];
