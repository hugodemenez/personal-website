import GeneratedContent from "@/components/generated-content";
import SubstackPosts from "@/components/posts/substack-posts";

export default async function Home() {
  return (
    <main className="flex flex-col gap-8 mt-4">
      <GeneratedContent />
      <SubstackPosts />
    </main>
  );
}
