'use client';

import { usePathname } from 'next/navigation';
import Link from "next/link";
import type { SubstackPost } from "@/types/substack-post";

interface NextButtonProps {
  posts: SubstackPost[];
}

export default function NextButton({ posts }: NextButtonProps) {
  const pathname = usePathname();
  const slug = pathname?.split('/').pop() || '';
  
  const currentIndex = posts.findIndex((post) => post.slug === slug);
  const nextPost =
    currentIndex !== -1 && currentIndex + 1 < posts.length
      ? posts[currentIndex + 1]
      : null;

  if (!nextPost) {
    return null;
  }

  return (
    <Link
      href={`/posts/${nextPost.slug}`}
      className="text-muted hover:text-accent transition-colors flex items-center gap-2 text-sm cursor-pointer"
      aria-label={`Go to next post: ${nextPost.title}`}
    >
      Next post →
    </Link>
  );
}