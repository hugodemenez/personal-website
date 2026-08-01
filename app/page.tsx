import GeneratedContent from "@/components/generated-content";
import SubstackPosts from "@/components/posts/substack-posts";
import { Suspense } from "react";

export default async function Home() {
  return (
    <>
      <main className="mx-auto max-w-xl overflow-visible px-4 pt-16 sm:px-0 sm:pt-24">
        <Suspense fallback={null}>
          <GeneratedContent />
        </Suspense>
      </main>
      <SubstackPosts />
    </>
  );
}
