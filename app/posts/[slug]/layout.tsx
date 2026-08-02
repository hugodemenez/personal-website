import PreviousButton from "./_components/post-previous-button";
import NextButton from "./_components/post-next-button";
import { fetchSubstackPosts } from "@/server/substack-feed";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function SlugLayout({ children }: LayoutProps) {
  const posts = await fetchSubstackPosts();

  return (
    <>
      <div className="sticky top-0 z-2 mb-4 flex items-center justify-between bg-background py-3 tracking-tight">
        <PreviousButton posts={posts} />
        <NextButton posts={posts} />
      </div>
      {children}
    </>
  );
}
