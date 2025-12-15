import { fetchSubstackPosts } from "@/lib/substack-feed";
import { cacheLife } from "next/cache";
import Link from "next/link";

interface NextButtonProps {
  slug: string;
}

export default async function NextButton({ slug }: NextButtonProps) {
  "use cache";
  cacheLife("max");

  const posts = await fetchSubstackPosts();
  const currentIndex = posts.findIndex((post) => post.slug === slug);
  const nextPost =
    currentIndex !== -1 && currentIndex + 1 < posts.length
      ? posts[currentIndex + 1]
      : null;

  if (!nextPost) {
    return null;
  }

  return (
    <Link
      href={`/posts/${nextPost.slug}`}
      className="text-muted hover:text-accent transition-colors flex items-center gap-2 text-sm cursor-pointer"
      aria-label={`Go to next post: ${nextPost.title}`}
    >
      Next post →
    </Link>
  );
}