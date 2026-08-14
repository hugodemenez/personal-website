import { PathMap } from "./path-map";
import type { DistinctPath } from "@/lib/shape-runs";

function PathCard({ path }: { path: DistinctPath }) {
  const averages = [
    path.averageDistanceLabel,
    path.averageDurationLabel,
    path.averagePaceLabel,
  ].filter(Boolean);
  const spanDays = path.spanDays ?? 1;
  const runLabel = path.count === 1 ? "1 run" : `${path.count} runs`;
  const spanLabel = spanDays === 1 ? "1 day" : `${spanDays} days`;
  const heading = `${runLabel} over ${spanLabel}`;
  const total = path.totalDistanceLabel
    ? `${path.totalDistanceLabel} total`
    : null;
  const average = averages.length ? `Average ${averages.join(" · ")}` : null;
  const ariaLabel = [heading, total, average].filter(Boolean).join(". ");

  return (
    <div className="text-center" aria-label={ariaLabel}>
      {path.sketch ? <PathMap sketch={path.sketch} /> : null}
      <h3 className="mt-3 text-base leading-snug tracking-[-0.015em] text-foreground sm:text-[1.05rem]">
        {heading}
      </h3>
      {total ? (
        <p className="mt-1 text-sm tabular-nums text-muted/70">{total}</p>
      ) : null}
      {average ? (
        <p className="mt-1 text-sm tabular-nums text-muted/70">{average}</p>
      ) : null}
    </div>
  );
}

export function RunPaths({ paths }: { paths: DistinctPath[] }) {
  return (
    <ul className="mt-8 grid grid-cols-2 justify-items-center gap-x-4 gap-y-8 sm:gap-x-6">
      {paths.map((path) => (
        <li key={path.run.id} className="w-full max-w-[15rem]">
          <PathCard path={path} />
        </li>
      ))}
    </ul>
  );
}
