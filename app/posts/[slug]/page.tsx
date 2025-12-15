import { Suspense } from "react";
import { BackButton } from "@/components/back-button";
import NextButton from "@/components/next-button";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx-components-list";
import { cacheLife } from "next/cache";
import { fetchSubstackPosts } from "@/lib/substack-feed";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Build-time static params for "known" Substack posts
export async function generateStaticParams() {
  const posts = await fetchSubstackPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// Page component (default export) wraps BlogPost with Suspense
export default function Page({ params }: PageProps) {
  return (
    <Suspense
      fallback={<div className="text-muted animate-pulse">Loading...</div>}
    >
      <BlogPost params={params} />
    </Suspense>
  );
}

async function BlogPost({ params }: PageProps) {
  const { slug } = await params;

  return (
    <>
      <div className="
        flex items-center justify-between mb-2 tracking-tight
        sticky top-2 left-0 right-0 z-60
        max-w-4xl mx-auto px-16 md:px-0 pt-3
        ">
        <BackButton />
        <NextButton slug={slug} />
      </div>
      <CachedBlogPost slug={slug} />
    </>
  );
}

// Cached component receives slug as prop and caches the fetched content
async function CachedBlogPost({ slug }: { slug: string }) {
  "use cache";
  cacheLife("max");

  const substackUrl = `https://hugodemenez.substack.com/p/${slug}`;
  // into.md usage: https://into.md/https://hugodemenez.substack.com/p/slug
  const intoMdUrl = `https://into.md/${substackUrl}`;

  const res = await fetch(intoMdUrl);

  if (!res.ok) {
    console.error(`Failed to fetch post from ${intoMdUrl}: ${res.status}`);
    notFound();
  }

  const body = await res.text();
  // 2. Handle “Conversion Failed” HTML specifically
  if (body.includes("Conversion Failed") || body.includes("<!DOCTYPE html>")) {
    notFound();
  }

  const markdown = body;

  // Preprocess markdown to fix specific formatting issues from into.md
  const processedMarkdown = markdown
    // Fix images wrapped in broken links with newlines: [ \n ![](...) \n ](...)
    .replace(/\[\s*(!\[.*?\]\(.*?\))\s*\]\(.*?\)/g, "$1")
    // Convert Twitter/X links (plain or markdown format) on their own line to Tweet components
    // Match plain links: https://x.com/user/status/123456
    .replace(
      /\[.*?\]\(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^\s\)]*)?\)/g,
      '\n<Tweet id="$1" />\n'
    )

  try {
    // Compile MDX
    const { content } = await compileMDX({
      source: processedMarkdown,
      options: { parseFrontmatter: true },
      components: mdxComponents,
    });
    return (
      <article className="prose prose-stone dark:prose-invert wrap-break-word">
        {content}
      </article>
    );
  } catch (error) {
    console.error("Error fetching blog post:", error);
    notFound();
  }
}
