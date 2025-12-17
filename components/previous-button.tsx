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
    return <div className="w-0 h-0"></div>;
  }

  return (
    <Link
      href={`/posts/${previousPost.slug}`}
      className="text-muted hover:text-accent transition-colors flex items-center gap-2 text-sm cursor-pointer"
      aria-label={`Go to previous post: ${previousPost.title}`}
    >
      ← Previous post
    </Link>
  );
}
