import assert from "node:assert/strict";
import test from "node:test";
import {
  RESUME_PLACE_COLUMNS,
  RESUME_PLACES,
  RESUME_PLACES_SUBTITLE,
  RESUME_PLACES_TITLE,
} from "./resume-places";

test("keeps the Places table title and column headers", () => {
  assert.equal(RESUME_PLACES_TITLE, "Places");
  assert.equal(RESUME_PLACES_SUBTITLE.length > 0, true);
  assert.deepEqual(
    RESUME_PLACE_COLUMNS.map((column) => column.header),
    ["Place", "Role", "What", "Year"]
  );
});

test("lists Shake-approved roles in a stable order", () => {
  assert.deepEqual(
    RESUME_PLACES.map((row) => ({
      place: row.place,
      role: row.role,
      what: row.what,
      year: row.year,
    })),
    [
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
    ]
  );
});

test("does not invent a year for the EDH collaboration", () => {
  const edh = RESUME_PLACES.find((row) => row.place.includes("EDH"));
  assert.ok(edh);
  assert.match(edh.place, /Rothschild & Co/);
  assert.equal(edh.year, "—");
  assert.equal(/\d/.test(edh.year), false);
});
