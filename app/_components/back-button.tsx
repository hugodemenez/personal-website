'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.back()}
      className="text-muted hover:text-accent transition-colors flex items-center gap-2 text-sm cursor-pointer"
      aria-label="Back to previous page"
    >
      ← Back
    </button>
  );
}
