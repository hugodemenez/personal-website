import GeneratedContent from "@/components/generated-content";
import SubstackPosts from "@/components/posts/substack-posts";
import { Suspense } from "react";

export default async function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto max-w-xl px-4 pt-16 sm:px-0 sm:pt-24">
        <Suspense fallback={null}>
          <GeneratedContent />
        </Suspense>
      </main>
      <SubstackPosts />
    </div>
  );
}
