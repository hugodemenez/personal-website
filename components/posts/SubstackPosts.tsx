import { fetchSubstackPosts } from "@/server/substack-feed";
import SubstackVisualizer from "./PostsVisualizer";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import "./post.css";

// We have to create a wrapper with a suspense fallback
export default function SubstackPosts() {
  return (
    <Suspense fallback={<SubstackVisualizer posts={[]} />}>
      <CachedSubstackPosts />
    </Suspense>
  );
}

async function CachedSubstackPosts() {
  "use cache";
  // We cache the result and revalidate it every minute
  cacheLife("minutes");
  await new Promise((resolve) => setTimeout(resolve, 10000));
  try {
    // This function is cached (build time purpose) and revalidated every minute
    const posts = await fetchSubstackPosts();
    if (!posts.length) {
      return <p className="text-muted">No posts available right now.</p>;
    }

    return <SubstackVisualizer posts={posts} />;
  } catch (error) {
    console.error("Failed to load Substack posts in about page:", error);
    return (
      <p className="text-muted">
        Unable to load posts right now. Please try again later.
      </p>
    );
  }
}
