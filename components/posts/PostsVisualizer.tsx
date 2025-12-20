"use client";

import { useState, useMemo, useEffect } from "react";
import type { SubstackPost } from "@/types/substack-post";
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

  // Reset selected index when original posts change
  useEffect(() => {
    setSelectedPostIndex(0);
  }, [posts]);

  if (!sortedPosts.length) return null;

  return (
    <div className="w-full flex flex-col group">
      <PostTable
        posts={sortedPosts}
        selectedPostIndex={selectedPostIndex}
        onSelectPost={setSelectedPostIndex}
      />
      <PostStack
        posts={sortedPosts}
        selectedPostIndex={selectedPostIndex}
        onSelectPost={setSelectedPostIndex}
      />
    </div>
  );
}
