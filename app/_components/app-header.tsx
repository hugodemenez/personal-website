import { Suspense } from "react";
import { HomeLink } from "./home-link";
import { Search } from "./search";
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

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 mx-auto flex max-w-xl items-center justify-between bg-linear-to-b from-background from-72% to-transparent px-4 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))] tracking-tight">
      <HomeLink />
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
