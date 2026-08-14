import { PathMap } from "./path-map";
import type { DistinctPath } from "@/lib/shape-runs";

function PathCard({ path }: { path: DistinctPath }) {
  const stats = [
    path.run.distanceLabel,
    path.run.durationLabel,
    path.run.paceLabel,
  ].filter(Boolean);
  const spanDays = path.spanDays ?? 1;
  const runLabel = path.count === 1 ? "1 run" : `${path.count} runs`;
  const spanLabel = spanDays === 1 ? "1 day" : `${spanDays} days`;
  const content = (
    <>
      {path.sketch ? <PathMap sketch={path.sketch} /> : null}
      <h3 className="mt-4 min-w-0 truncate text-[1.05rem] leading-snug tracking-[-0.015em] text-foreground transition-colors group-hover:text-accent">
        {runLabel} over {spanLabel}
      </h3>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-muted/70">
          Last run was {path.run.title}
        </p>
        <time
          className="shrink-0 text-sm tabular-nums text-muted/70"
          dateTime={path.run.date}
        >
          {path.run.dateLabel}
        </time>
      </div>
      {stats.length ? (
        <p className="mt-1 text-sm tabular-nums text-muted/70">
          {stats.join(" · ")}
        </p>
      ) : null}
    </>
  );

  if (path.run.href) {
    return (
      <a
        className="group block"
        href={path.run.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {content}
      </a>
    );
  }

  return <div>{content}</div>;
}

export function RunPaths({ paths }: { paths: DistinctPath[] }) {
  return (
    <ul className="mt-8 space-y-8">
      {paths.map((path) => (
        <li
          key={path.run.id}
          aria-label={`${path.count === 1 ? "1 run" : `${path.count} runs`} over ${(path.spanDays ?? 1) === 1 ? "1 day" : `${path.spanDays} days`}, last run was ${path.run.title}`}
        >
          <PathCard path={path} />
        </li>
      ))}
    </ul>
  );
}
