import GeneratedContent from "@/components/generated-content";
import SubstackPosts from "@/components/posts/substack-posts";
import { Suspense } from "react";

export default async function Home() {
  return (
    <div className="mt-4 flex flex-col gap-8 overflow-visible">
      <Suspense fallback={null}>
        <GeneratedContent />
        <SubstackPosts />
      </Suspense>
    </div>
  );
}
