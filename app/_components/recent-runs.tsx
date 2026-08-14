import { RunPaths } from "./run-paths";
import { loadRunningSection } from "@/server/shape";
import { cacheLife } from "next/cache";

async function CachedRunningPaths() {
  "use cache";
  cacheLife("hours");

  const { paths } = await loadRunningSection();
  if (!paths.length) return null;

  return <RunPaths paths={paths} />;
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
      <CachedRunningPaths />
    </section>
  );
}
