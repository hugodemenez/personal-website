import {
  RESUME_PLACE_COLUMNS,
  RESUME_PLACES,
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

export function PlacesTable({
  activeKey,
  onSelect,
}: {
  activeKey?: string | null;
  onSelect?: (key: string) => void;
}) {
  const selectable = typeof onSelect === "function";

  return (
    <table
      aria-label="Places: role, what, and year"
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
        {RESUME_PLACES.map((row) => {
          const active = activeKey === row.label;
          return (
            <tr
              aria-current={active ? "true" : undefined}
              className={`block border-b border-border py-3 sm:table-row sm:py-0 ${
                selectable ? "cursor-pointer" : ""
              } ${
                active
                  ? "text-foreground shadow-[inset_2px_0_0_var(--color-accent)]"
                  : ""
              }`}
              key={row.label}
              onClick={selectable ? () => onSelect(row.label) : undefined}
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
                      {selectable ? (
                        <button
                          className="text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(row.label);
                          }}
                          type="button"
                        >
                          {value}
                        </button>
                      ) : (
                        value
                      )}
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
                    <span className={active ? "text-foreground/80" : undefined}>
                      {value}
                    </span>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
