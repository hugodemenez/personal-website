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
      {/* No position:sticky anywhere on the site. On the landing page a sticky
          element reliably made iOS Safari reserve an opaque strip at its bottom
          bar instead of letting content flow under it, so we avoid it here too. */}
      <div className="mb-4 flex items-center justify-between py-3 tracking-tight">
        <PreviousButton posts={posts} />
        <NextButton posts={posts} />
      </div>
      {children}
    </>
  );
}
