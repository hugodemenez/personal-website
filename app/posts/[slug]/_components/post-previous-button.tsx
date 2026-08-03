"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { SubstackPost } from "@/types/substack-post";

interface PreviousButtonProps {
  posts: SubstackPost[];
}

export default function PreviousButton({ posts }: PreviousButtonProps) {
  const pathname = usePathname();
  const slug = pathname?.split("/").pop() || "";

  const currentIndex = posts.findIndex((post) => post.slug === slug);
  const previousPost =
    currentIndex !== -1 && currentIndex > 0 ? posts[currentIndex - 1] : null;

  if (!previousPost) {
    return null;
  }

  return (
    <Link
      href={`/posts/${previousPost.slug}`}
      className="text-muted hover:text-accent transition-colors flex min-h-11 items-center gap-2 text-sm cursor-pointer"
      aria-label={`Go to previous post: ${previousPost.title}`}
    >
      ← Previous<span className="hidden sm:inline"> post</span>
    </Link>
  );
}
