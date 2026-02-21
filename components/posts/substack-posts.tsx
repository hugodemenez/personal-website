import { fetchSubstackPosts } from "@/server/substack-feed";
import SubstackVisualizer from "./post-visualizer";
import { Suspense } from "react";
import "./post.css";

export default function SubstackPosts() {
  return (
    <Suspense fallback={<SubstackVisualizer posts={[]} />}>
      <SubstackPostsInner />
    </Suspense>
  );
}

async function SubstackPostsInner() {
  try {
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
