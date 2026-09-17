import { Suspense } from "react";
import { HomeLink } from "./home-link";
import PreviousButton from "@/app/posts/[slug]/_components/post-previous-button";
import NextButton from "@/app/posts/[slug]/_components/post-next-button";
import { fetchSubstackPosts } from "@/server/substack-feed";

// Lives in the header so it is pinned by the same shell and stays reachable at
// any scroll position — you can hit Next repeatedly without scrolling back up.
// Both buttons resolve the current post from the pathname and render nothing
// when it is not a post page, so this is safe to mount globally.
async function PostNav() {
  const posts = await fetchSubstackPosts();

  // Two equal columns filling the space after Home, each button anchored to
  // its own edge. Sizing to content instead would let Next slide right whenever
  // Previous is absent (first post) and back when it returns.
  return (
    <div className="grid flex-1 grid-cols-2 items-center gap-3">
      <div className="justify-self-start">
        <PreviousButton posts={posts} />
      </div>
      <div className="justify-self-end">
        <NextButton posts={posts} />
      </div>
    </div>
  );
}

// Stays in normal flow — PinnedShell in layout.tsx does the pinning by
// transform. Making this position:fixed takes it out of flow, so the shell
// wraps a zero-height box and pins nothing.
export function Header() {
  return (
    <header className="flex items-center justify-between gap-3 py-3 tracking-tight">
      <HomeLink />
      <Suspense fallback={null}>
        <PostNav />
      </Suspense>
    </header>
  );
}
