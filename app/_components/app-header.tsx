import { Suspense } from "react";
import { HomeLink } from "./home-link";
import { Search } from "./search";
import PreviousButton from "@/app/posts/[slug]/_components/post-previous-button";
import NextButton from "@/app/posts/[slug]/_components/post-next-button";
import { getPosts, type PostMetadata } from "@/lib/posts";
import { fetchSubstackPosts } from "@/server/substack-feed";

async function SearchWithPosts() {
  const posts = await getPosts();
  const externalPosts = await fetchSubstackPosts();

  const parsedExternalPosts: PostMetadata[] = externalPosts.map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.pubDate,
    description: post.description,
    tags: ["substack"],
    author: "Hugo Demenez",
    available: post.available,
  })) as PostMetadata[];

  const allPosts = [...posts, ...parsedExternalPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return <Search posts={allPosts} />;
}

// Lives in the header so it is pinned by the same shell and stays reachable at
// any scroll position — you can hit Next repeatedly without scrolling back up.
// Both buttons resolve the current post from the pathname and render nothing
// when it is not a post page, so this is safe to mount globally.
async function PostNav() {
  const posts = await fetchSubstackPosts();

  // Two equal columns filling the space between Home and search, each button
  // anchored to its own edge. Sizing to content instead would let Next slide
  // right whenever Previous is absent (first post) and back when it returns.
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
      <nav>
        <ul className="flex items-center gap-6 text-muted">
          <li>
            <Suspense
              fallback={
                <button
                  disabled
                  className="p-2 text-muted hover:text-accent transition-colors"
                  aria-label="Search posts"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              }
            >
              <SearchWithPosts />
            </Suspense>
          </li>
        </ul>
      </nav>
    </header>
  );
}
