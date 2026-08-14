import { getRunningSection } from "@/server/shape";
import type { RecentRun, RouteHeatmap } from "@/lib/shape-runs";
import { Suspense } from "react";

function RouteHeatmapMap({ heatmap }: { heatmap: RouteHeatmap }) {
  return (
    <figure className="mt-5">
      <svg
        aria-hidden="true"
        className="h-auto w-full overflow-hidden rounded-xl border border-border bg-surface"
        viewBox={`0 0 ${heatmap.width} ${heatmap.height}`}
      >
        {heatmap.edges.map((edge) => {
          const accent = Math.round(18 + edge.intensity * 82);
          return (
            <line
              key={`${edge.x1},${edge.y1}-${edge.x2},${edge.y2}`}
              opacity={0.22 + edge.intensity * 0.78}
              strokeLinecap="round"
              strokeWidth={(1.1 + edge.intensity * 2.6).toFixed(2)}
              style={{
                stroke: `color-mix(in srgb, var(--accent) ${accent}%, var(--muted))`,
              }}
              x1={edge.x1}
              x2={edge.x2}
              y1={edge.y1}
              y2={edge.y2}
            />
          );
        })}
      </svg>
      <figcaption className="mt-2 text-sm text-muted/70">
        Streets from {heatmap.routeCount} overlapping runs. Brighter lines are
        the ones I repeat most.
      </figcaption>
    </figure>
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
  const { runs, heatmap } = await getRunningSection();
  if (!runs.length) return null;

  return (
    <section aria-labelledby="runs-heading" className="mt-10">
      <h2
        id="runs-heading"
        className="font-serif text-3xl tracking-[-0.035em] text-foreground"
      >
        Running
      </h2>
      {heatmap ? <RouteHeatmapMap heatmap={heatmap} /> : null}
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
