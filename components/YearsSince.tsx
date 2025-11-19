'use client';

import { useEffect, useState } from 'react';

interface YearsSinceProps {
  startYear: number;
}

export default function YearsSince({ startYear }: YearsSinceProps) {
  // Initial state matches what we expect the server to render if we were using static generation,
  // but since new Date() in server component caused the issue, we move the logic here.
  // However, simply moving it to client doesn't solve the mismatch if we render immediately.
  
  // The error "Route /about used new Date()" implies it's a static page generation issue.
  // The best fix for static pages is to just calculate it once during build or use a fixed date,
  // OR use a client component that mounts.

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fallback for server/initial render (could be hardcoded or empty)
  // If we want to show the number immediately without hydration error, we need to know the year at build time.
  // But simpler is just to render it client side only or suppress hydration warning.
  
  if (!mounted) {
    return <span suppressHydrationWarning>{new Date().getFullYear() - startYear}</span>;
  }

  return <span>{new Date().getFullYear() - startYear}</span>;
}
