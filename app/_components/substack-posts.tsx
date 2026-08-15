import { fetchSubstackPosts } from "@/server/substack-feed";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import SubstackVisualizer from "./post-visualizer";

export default function SubstackPosts() {
  return (
    <Suspense fallback={<SubstackVisualizer posts={[]} />}>
      <SubstackPostsInner />
    </Suspense>
  );
}

async function SubstackPostsInner() {
  "use cache";
  cacheLife("max");

  try {
    const posts = await fetchSubstackPosts();
    if (!posts.length) {
      return (
        <p className="mt-8 text-muted">
          No posts available right now.
        </p>
      );
    }

    return <SubstackVisualizer posts={posts} />;
  } catch (error) {
    console.error("Failed to load Substack posts in about page:", error);
    return (
      <p className="mt-8 text-muted">
        Unable to load posts right now. Please try again later.
      </p>
    );
  }
}
