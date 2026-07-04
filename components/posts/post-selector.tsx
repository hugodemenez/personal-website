"use client";

import type { SubstackPost } from "@/types/substack-post";

interface PostSelectorProps {
  posts: SubstackPost[];
  selectedPostIndex: number;
  onSelectPost: (index: number) => void;
}

function formatShortDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

export default function PostSelector({
  posts,
  selectedPostIndex,
  onSelectPost,
}: PostSelectorProps) {
  const activePost = posts[selectedPostIndex];

  return (
    <section
      className="post-navigator mb-4 overflow-hidden rounded-xl border border-border bg-surface/70 shadow-sm"
      aria-label="Blog post navigator"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 md:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Blog navigator
          </p>
          <h3 className="mt-1 text-lg font-semibold text-foreground md:text-xl">
            {activePost?.title ?? "All posts"}
          </h3>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted">
          {selectedPostIndex + 1}/{posts.length}
        </span>
      </div>

      <div
        className="post-navigator__rail"
        role="listbox"
        aria-label="Choose a blog post"
      >
        {posts.map((post, index) => {
          const isSelected = index === selectedPostIndex;

          return (
            <button
              key={`${post.slug}${index}`}
              type="button"
              role="option"
              aria-selected={isSelected}
              className="post-navigator__item"
              onClick={() => onSelectPost(index)}
            >
              <span className="post-navigator__index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="post-navigator__content">
                <span className="post-navigator__title">{post.title}</span>
                <span className="post-navigator__meta">
                  {formatShortDate(post.pubDate)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
