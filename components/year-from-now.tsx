import { cacheLife } from "next/cache";
import { Suspense } from "react";

async function CachedYearFromNow({ year }: { year: number }) {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear() - year;
}

export default function YearFromNow({ year }: { year: number }) {
  return (
    <Suspense fallback={<span>...</span>}>
      <CachedYearFromNow year={year} />
    </Suspense>
  );
}