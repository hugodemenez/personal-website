"use client";

import Image from "next/image";
import Link from "next/link";
import type { SubstackPost } from "@/types/substack-post";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function PostCard({ post }: { post: SubstackPost }) {
  return (
    <div className="w-full h-fit">
      <Link
        href={post.slug ? `/posts/${post.slug}` : post.link}
        target={post.slug ? undefined : "_blank"}
        rel={post.slug ? undefined : "noopener noreferrer"}
      >
        <div className="relative w-full bg-surface aspect-2/1 group-focus-within:border-accent border-l border-r border-border">
          {post.image ? (
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 90vw, 700px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface text-muted/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
          )}
        </div>
        <div className="p-6 md:p-8 bg-background border border-border border-t-0 group-focus-within:border-accent rounded-b-xl transition-colors duration-200">
          {post.description && (
            <p className="text-sm md:text-base text-muted mb-3 md:mb-4 leading-relaxed line-clamp-1 wrap-break-word">
              {post.description}
            </p>
          )}
          <p className="text-xs md:text-sm text-muted">
            {formatDate(post.pubDate)}
          </p>
        </div>
      </Link>
    </div>
  );
}
