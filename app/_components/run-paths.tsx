import { PathMap } from "./path-map";
import type { DistinctPath } from "@/lib/shape-runs";

function PathCard({ path }: { path: DistinctPath }) {
  const stats = [
    path.averageDistanceLabel,
    path.averageDurationLabel,
    path.averagePaceLabel,
  ].filter(Boolean);
  const spanDays = path.spanDays ?? 1;
  const runLabel = path.count === 1 ? "1 run" : `${path.count} runs`;
  const spanLabel = spanDays === 1 ? "1 day" : `${spanDays} days`;
  const heading = `${runLabel} over ${spanLabel}`;

  return (
    <div aria-label={stats.length ? `${heading}. Average ${stats.join(" · ")}` : heading}>
      {path.sketch ? <PathMap sketch={path.sketch} /> : null}
      <h3 className="mt-3 text-base leading-snug tracking-[-0.015em] text-foreground sm:text-[1.05rem]">
        {heading}
      </h3>
      {stats.length ? (
        <p className="mt-1 text-sm tabular-nums text-muted/70">
          {stats.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

export function RunPaths({ paths }: { paths: DistinctPath[] }) {
  return (
    <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6">
      {paths.map((path) => (
        <li key={path.run.id}>
          <PathCard path={path} />
        </li>
      ))}
    </ul>
  );
}
