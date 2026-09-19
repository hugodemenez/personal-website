import { PathMap } from "./path-map";
import type { DistinctPath } from "@/lib/shape-runs";

function PathRow({ path }: { path: DistinctPath }) {
  const description = path.run.title;
  const stats = [
    path.run.dateLabel,
    path.run.distanceLabel,
    path.run.durationLabel,
    path.run.paceLabel,
  ].filter(Boolean);
  const ariaLabel = [description, path.placeName, stats.join(" · ")]
    .filter(Boolean)
    .join(". ");

  return (
    <div className="flex items-center gap-4 sm:gap-5" aria-label={ariaLabel}>
      {path.sketch ? <PathMap sketch={path.sketch} /> : null}
      <div className="min-w-0">
        <h3 className="text-base leading-snug tracking-[-0.015em] text-foreground sm:text-[1.05rem]">
          {description}
        </h3>
        {path.placeName ? (
          <p className="mt-0.5 text-sm text-muted/70">{path.placeName}</p>
        ) : null}
        {stats.length ? (
          <p className="mt-0.5 text-sm tabular-nums text-muted/70">
            {stats.join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RunPaths({ paths }: { paths: DistinctPath[] }) {
  return (
    <div className="mt-8">
      <p className="text-sm text-muted">Recent mapped runs.</p>
      <ul className="mt-4">
        {paths.map((path) => (
          <li
            key={path.run.id}
            className="border-t border-border/70 py-4 first:border-t-0 first:pt-0 last:pb-0"
          >
            <PathRow path={path} />
          </li>
        ))}
      </ul>
    </div>
  );
}
