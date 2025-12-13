import { cacheLife } from "next/cache";
import { researchAgent } from "@/server/search-agent";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "./mdx-components-list";
import { Suspense } from "react";

export default function GeneratedContent() {
  return (
    <Suspense
      fallback={<p className="animate-pulse">Searching about Hugo Demenez...</p>}
    >
      <CachedGeneratedContent />
    </Suspense>
  );
}
async function CachedGeneratedContent() {
  "use cache";
  cacheLife("days");
  const result = await researchAgent.generate({
    prompt: "Who is Hugo Demenez and what are his projects?",
  });

  const { content } = await compileMDX({
    source: result.text,
    options: { parseFrontmatter: true },
    components: mdxComponents,
  });

  return <div>{content}</div>;
}
