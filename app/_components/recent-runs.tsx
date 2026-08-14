import { RunPathCarousel } from "./run-path-carousel";
import { loadRunningSection } from "@/server/shape";
import { cacheLife } from "next/cache";
import { Suspense } from "react";

function RunningCarouselPlaceholder() {
  return (
    <div aria-hidden="true" className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-12 rounded bg-surface" />
        <div className="h-4 w-10 rounded bg-surface" />
      </div>
      <div className="mx-auto h-20 w-[15rem] rounded bg-surface" />
      <div className="mt-4 flex items-center justify-between">
        <div className="h-5 w-28 rounded bg-surface" />
        <div className="h-4 w-12 rounded bg-surface" />
      </div>
      <div className="mt-2 h-4 w-40 rounded bg-surface" />
      <div className="mt-2 h-4 w-36 rounded bg-surface" />
    </div>
  );
}

async function RunningCarouselSnapshot() {
  "use cache";
  cacheLife("max");

  const { paths } = await loadRunningSection();
  if (!paths.length) return <RunningCarouselPlaceholder />;

  return <RunPathCarousel paths={paths} />;
}

async function CachedRunningCarousel() {
  "use cache";
  cacheLife("minutes");

  const { paths } = await loadRunningSection();
  if (!paths.length) return null;

  return <RunPathCarousel paths={paths} />;
}

export default function RecentRuns() {
  return (
    <section aria-labelledby="runs-heading" className="mt-10">
      <h2
        id="runs-heading"
        className="font-serif text-3xl tracking-[-0.035em] text-foreground"
      >
        Running
      </h2>
      <p className="mt-4 leading-relaxed text-muted">
        I started running as a trader, to empty my mind after intense sessions.
        I kept the habit for stamina and endurance as I get older. I run early,
        without music: birds, sunlight, and the occasional race for fun.
      </p>
      <Suspense fallback={<RunningCarouselSnapshot />}>
        <CachedRunningCarousel />
      </Suspense>
    </section>
  );
}
