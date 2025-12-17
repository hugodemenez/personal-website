import { fetchSubstackPosts } from "@/lib/substack-feed";
import SubstackVisualizer from "./PostsVisualizer";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import "./post.css";

// We have to create a wrapper with a suspense fallback
export default function SubstackPosts() {
  return (
    <Suspense fallback={<SubstackPostsFallback />}>
      <CachedSubstackPosts />
    </Suspense>
  );
}

function SubstackPostsFallback() {
  // We use only our local posts that we compute at build time
  return <SubstackVisualizer posts={[]} />;
}

async function CachedSubstackPosts() {
  "use cache";
  cacheLife("weeks");
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
