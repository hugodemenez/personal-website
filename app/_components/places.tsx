import {
  RESUME_PLACE_COLUMNS,
  RESUME_PLACES,
  RESUME_PLACES_SUBTITLE,
  RESUME_PLACES_TITLE,
  type ResumePlaceField,
} from "@/lib/resume-places";

function cellClass(key: ResumePlaceField): string {
  if (key === "place") {
    return "block py-2.5 pr-4 font-medium text-foreground max-sm:pb-1 sm:table-cell sm:w-[28%] sm:align-top";
  }

  if (key === "role") {
    return "grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-x-3 py-0.5 pr-4 text-muted sm:table-cell sm:whitespace-nowrap sm:align-top sm:py-2.5";
  }

  if (key === "year") {
    return "grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-x-3 py-0.5 text-muted tabular-nums whitespace-nowrap sm:table-cell sm:w-[5.5rem] sm:py-2.5 sm:align-top";
  }

  return "grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-x-3 py-0.5 pr-4 text-muted sm:table-cell sm:align-top sm:py-2.5";
}

export function Places() {
  return (
    <section aria-labelledby="places-heading" className="mt-10" id="places">
      <h2
        id="places-heading"
        className="font-serif text-3xl tracking-[-0.035em] text-foreground"
      >
        {RESUME_PLACES_TITLE}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {RESUME_PLACES_SUBTITLE}
      </p>

      <table
        aria-labelledby="places-heading"
        className="mt-5 w-full border-collapse text-left text-sm leading-snug"
      >
        <thead className="max-sm:sr-only">
          <tr className="border-b border-border text-xs text-muted">
            {RESUME_PLACE_COLUMNS.map((column) => (
              <th
                className={`py-2 font-medium ${
                  column.key === "year" ? "whitespace-nowrap" : "pr-4"
                }`}
                key={column.key}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-sm:border-t max-sm:border-border">
          {RESUME_PLACES.map((row) => (
            <tr
              className="block border-b border-border py-3 sm:table-row sm:py-0"
              key={row.place}
            >
              {RESUME_PLACE_COLUMNS.map((column) => {
                const value = row[column.key];

                if (column.key === "place") {
                  return (
                    <th
                      className={cellClass(column.key)}
                      key={column.key}
                      scope="row"
                    >
                      {value}
                    </th>
                  );
                }

                return (
                  <td className={cellClass(column.key)} key={column.key}>
                    <span
                      aria-hidden="true"
                      className="text-xs text-muted/80 sm:hidden"
                    >
                      {column.header}
                    </span>
                    <span>{value}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
