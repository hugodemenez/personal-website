import GeneratedContent from "@/components/generated-content";
import SubstackPosts from "@/components/posts/SubstackPosts";
import { fetchSubstackPosts, SubstackPost } from "@/lib/substack-feed";

export default async function Home() {
  const posts = await fetchSubstackPosts();
  return (
    <main className="flex flex-col gap-8 mt-4">
      <GeneratedContent />
      <SubstackPosts />
    </main>
  );
}
