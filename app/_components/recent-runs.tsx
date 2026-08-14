import { getRecentRuns } from "@/server/shape";
import { MAP_HEIGHT, MAP_WIDTH, type RecentRun } from "@/lib/shape-runs";
import { Suspense } from "react";

function RunMap({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      className="h-10 w-[7.5rem] shrink-0 text-muted/50"
      fill="none"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
    >
      <path
        d={path}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function RunStats({ run }: { run: RecentRun }) {
  const stats = [run.distanceLabel, run.durationLabel, run.paceLabel].filter(
    Boolean
  );

  if (!stats.length) return null;

  return (
    <p className="mt-1 text-sm tabular-nums text-muted/70">
      {stats.join(" · ")}
    </p>
  );
}

function RunItem({ run }: { run: RecentRun }) {
  const content = (
    <>
      <time
        className="w-16 shrink-0 text-sm tabular-nums text-muted/70"
        dateTime={run.date}
      >
        {run.dateLabel}
      </time>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[1.05rem] leading-snug tracking-[-0.015em] text-foreground transition-colors group-hover:text-accent">
          {run.title}
        </h3>
        <RunStats run={run} />
      </div>
      {run.mapPath ? <RunMap path={run.mapPath} /> : null}
    </>
  );

  if (run.href) {
    return (
      <a
        className="group flex items-center gap-3 py-3 sm:gap-4"
        href={run.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {content}
      </a>
    );
  }

  return <div className="flex items-center gap-3 py-3 sm:gap-4">{content}</div>;
}

async function RecentRunsList() {
  const runs = await getRecentRuns();
  if (!runs.length) return null;

  return (
    <section aria-labelledby="runs-heading" className="mt-10">
      <h2
        id="runs-heading"
        className="font-serif text-3xl tracking-[-0.035em] text-foreground"
      >
        Running
      </h2>
      <ol className="mt-4 divide-y divide-border">
        {runs.map((run) => (
          <li key={run.id}>
            <RunItem run={run} />
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function RecentRuns() {
  return (
    <Suspense fallback={null}>
      <RecentRunsList />
    </Suspense>
  );
}
