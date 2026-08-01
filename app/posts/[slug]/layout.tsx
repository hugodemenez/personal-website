import PreviousButton from "@/components/posts/post-previous-button";
import NextButton from "@/components/posts/post-next-button";
import { fetchSubstackPosts } from "@/server/substack-feed";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function SlugLayout({ children }: LayoutProps) {
  const posts = await fetchSubstackPosts();

  return (
    <>
      <div
        className="
        flex items-center justify-between mb-2 tracking-tight
        sticky top-2 left-0 right-0 z-2
        max-w-4xl mx-16 md:px-0 pt-3
        "
      >
        <PreviousButton posts={posts} />
        <NextButton posts={posts} />
      </div>
      {children}
    </>
  );
}
