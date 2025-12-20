import { Suspense } from "react";
import PreviousButton from "@/components/posts/post-previous-button";
import NextButton from "@/components/posts/post-next-button";
import { fetchSubstackPosts } from "@/server/substack-feed";
import { cacheLife } from "next/cache";

interface LayoutProps {
  children: React.ReactNode;
}

async function CachedPosts() {
  "use cache";
  cacheLife("max");
  return await fetchSubstackPosts();
}

export default async function SlugLayout({ children }: LayoutProps) {
  return (
    <>
      <div className="
        flex items-center justify-between mb-2 tracking-tight
        sticky top-2 left-0 right-0 z-2
        max-w-4xl mx-16 md:px-0 pt-3
        ">
        <Suspense fallback={null}>
          <PostsNavigation />
        </Suspense>
      </div>
      {children}
    </>
  );
}

async function PostsNavigation() {
  const posts = await CachedPosts();
  
  return (
    <>
      <PreviousButton posts={posts} />
      <NextButton posts={posts} />
    </>
  );
}

