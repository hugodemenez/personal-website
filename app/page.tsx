import GeneratedContent from "@/components/generated-content";
import SubstackPosts from "@/components/posts/substack-posts";
import { Suspense } from "react";

export default async function Home() {
  return (
    <main className="flex flex-col gap-8 mt-4">
      <Suspense fallback={null}>
        <GeneratedContent />
        <SubstackPosts />
      </Suspense>
    </main>
  );
}
