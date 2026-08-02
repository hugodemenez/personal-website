import PreviousButton from "./_components/post-previous-button";
import NextButton from "./_components/post-next-button";
import { PinnedShell } from "@/app/_components/pinned-shell";
import { fetchSubstackPosts } from "@/server/substack-feed";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function SlugLayout({ children }: LayoutProps) {
  const posts = await fetchSubstackPosts();

  return (
    <>
      {/* Pinned the same way as the landing's Writing title rather than with
          position:sticky, so both pages behave identically. offset clears the
          pinned header. */}
      <PinnedShell
        className="relative z-20 -mx-4 mb-2 flex items-center justify-between px-4 py-3 tracking-tight"
        offset={52}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-background"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-full h-8 bg-linear-to-b from-background to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        {/* relative so the links paint above the backdrop layers and stay hit-testable */}
        <div className="relative">
          <PreviousButton posts={posts} />
        </div>
        <div className="relative">
          <NextButton posts={posts} />
        </div>
      </PinnedShell>
      {children}
    </>
  );
}
