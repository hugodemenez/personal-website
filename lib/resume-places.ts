/**
 * Homepage Places table. Copy lives here so wording can change without JSX edits.
 */
export const RESUME_PLACES_TITLE = "Places";
export const RESUME_PLACES_SUBTITLE = "What I did at each stop.";

export const RESUME_PLACE_COLUMNS = [
  { key: "place", header: "Place" },
  { key: "role", header: "Role" },
  { key: "what", header: "What" },
  { key: "year", header: "Year" },
] as const;

export type ResumePlaceField = (typeof RESUME_PLACE_COLUMNS)[number]["key"];

export interface ResumePlace {
  place: string;
  role: string;
  what: string;
  year: string;
}

export const RESUME_PLACES: readonly ResumePlace[] = [
  {
    place: "ISEN",
    role: "Engineering degree",
    what: "Computer science and quantitative finance, Lille",
    year: "2018-2023",
  },
  {
    place: "Cofidis",
    role: "Fullstack developer",
    what: "Fraud detection and customer chatbot, Lisbon",
    year: "2022",
  },
  {
    place: "Harvard Business School Online",
    role: "Certificate",
    what: "Design thinking and innovation",
    year: "2023",
  },
  {
    place: "Foundever",
    role: "Backend engineer",
    what: "Global",
    year: "Present",
  },
  {
    place: "EDH with Rothschild & Co",
    role: "BI analytics",
    what: "Business intelligence collaboration",
    year: "—",
  },
];
