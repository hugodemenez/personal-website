import { RunPathCarousel } from "./run-path-carousel";
import { getRunningSection } from "@/server/shape";
import { Suspense } from "react";

async function RecentRunsList() {
  const { paths } = await getRunningSection();
  if (!paths.length) return null;

  return (
    <section aria-labelledby="runs-heading" className="mt-10">
      <h2
        id="runs-heading"
        className="font-serif text-3xl tracking-[-0.035em] text-foreground"
      >
        Running
      </h2>
      <RunPathCarousel paths={paths} />
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
