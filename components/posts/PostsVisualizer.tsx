"use client";

import { useState, useMemo } from "react";
import type { SubstackPost } from "@/lib/substack-feed";
import PostStack from "./PostStack";
import PostTable from "./PostTable";

interface PostsVisualizerProps {
  posts: SubstackPost[];
}

export default function PostsVisualizer({ posts }: PostsVisualizerProps) {
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);

  // Sort posts by date descending (latest first)
  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      ),
    [posts]
  );

  if (!sortedPosts.length) return null;

  return (
    <div className="w-full flex flex-col">
      <PostTable
        posts={sortedPosts}
        selectedPostIndex={selectedPostIndex}
        onSelectPost={setSelectedPostIndex}
      />
      <section className="flex items-center justify-center min-h-[500px] md:min-h-[600px] py-4 md:py-8" style={{ overflow: 'visible' }}>
        <PostStack
          posts={sortedPosts}
          selectedPostIndex={selectedPostIndex}
          onSelectPost={setSelectedPostIndex}
        />
      </section>
    </div>
  );
}
