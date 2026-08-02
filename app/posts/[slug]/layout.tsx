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
      {/* main's sticky nav, with two values it inherited from main's layout:
          top-2 -> top-14, because the pinned header owns the first ~52px here
          (top-2 puts this behind it), and max-w-4xl/mx-16 dropped, because body
          is already the narrow container — mx-16 would squeeze it to ~240px. */}
      <div
        className="
        flex items-center justify-between mb-2 tracking-tight
        sticky top-14 left-0 right-0 z-2
        bg-background -mx-4 px-4 py-3
        "
      >
        <PreviousButton posts={posts} />
        <NextButton posts={posts} />
      </div>
      {children}
    </>
  );
}
