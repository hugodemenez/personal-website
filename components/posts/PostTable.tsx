'use client';

import type { SubstackPost } from '@/types/substack-post';

interface PostTableProps {
  posts: SubstackPost[];
  selectedPostIndex: number;
  onSelectPost: (index: number) => void;
}

export default function PostTable({
  posts,
  selectedPostIndex,
  onSelectPost,
}: PostTableProps) {
  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <h3 className="text-xl font-semibold mb-4 text-foreground shrink-0">
        All Posts
      </h3>
      <select
        value={selectedPostIndex}
        onChange={(e) => onSelectPost(Number(e.target.value))}
        className="w-full p-3 rounded-t-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-200 cursor-pointer"
      >
        {posts.map((post, index) => (
          <option key={post.slug} value={index}>
            {post.title.length > 60 ? `${post.title.slice(0, 60)}...` : post.title}
          </option>
        ))}
      </select>
    </div>
  );
}
