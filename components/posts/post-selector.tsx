"use client";

import type { SubstackPost } from "@/types/substack-post";

interface PostSelectorProps {
  posts: SubstackPost[];
  selectedPostIndex: number;
  onSelectPost: (index: number) => void;
}

export default function PostSelector({
  posts,
  selectedPostIndex,
  onSelectPost,
}: PostSelectorProps) {
  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <h3 className="text-xl font-semibold mb-4 text-foreground shrink-0">
        All Posts
      </h3>
      <div className="relative">
        <select
          value={selectedPostIndex}
          onChange={(e) => onSelectPost(Number(e.target.value))}
          className="appearance-none w-full p-3 pr-10 rounded-t-lg border border-border border-b-0 bg-background text-foreground focus:outline-none focus:border-accent transition-colors duration-200 cursor-pointer"
        >
          {posts.map((post, index) => (
            <option key={post.slug+index} value={index}>
              {post.title.length > 60
                ? `${post.title.slice(0, 60)}...`
                : post.title}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-5 h-5 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
