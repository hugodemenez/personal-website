import { PathMap } from "./path-map";
import type { DistinctPath } from "@/lib/shape-runs";

function PathCard({ path }: { path: DistinctPath }) {
  const stats = [
    path.run.distanceLabel,
    path.run.durationLabel,
    path.run.paceLabel,
  ].filter(Boolean);
  const heading = path.placeName ?? path.run.title;
  const detail = path.placeName
    ? [path.run.title, path.run.dateLabel].filter(Boolean).join(" · ")
    : path.run.dateLabel;
  const ariaLabel = [heading, detail, stats.join(" · ")]
    .filter(Boolean)
    .join(". ");

  return (
    <div className="text-center" aria-label={ariaLabel}>
      {path.sketch ? <PathMap sketch={path.sketch} /> : null}
      <h3 className="mt-3 text-base leading-snug tracking-[-0.015em] text-foreground sm:text-[1.05rem]">
        {heading}
      </h3>
      {detail ? (
        <p className="mt-1 text-sm text-muted/70">{detail}</p>
      ) : null}
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
    <div className="mt-8">
      <p className="text-sm text-muted">Recent mapped runs.</p>
      <ul className="mt-4 grid grid-cols-2 justify-items-center gap-x-4 gap-y-8 sm:gap-x-6">
        {paths.map((path) => (
          <li key={path.run.id} className="w-full max-w-[15rem]">
            <PathCard path={path} />
          </li>
        ))}
      </ul>
    </div>
  );
}
