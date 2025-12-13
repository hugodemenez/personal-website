import { Suspense } from "react";
import { BackButton } from "@/components/back-button";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx-components-list";
import { cacheLife } from "next/cache";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Page component (default export) wraps BlogPost with Suspense
export default function Page({ params }: PageProps) {
  return (
      <Suspense fallback={<div className="text-muted"></div>}>
        <BlogPost params={params} />
      </Suspense>
  );
}

// BlogPost reads the slug from params and passes it to cached component
async function BlogPost({ params }: PageProps) {
  const { slug } = await params;
  return <CachedBlogPost slug={slug} />;
}

// Cached component receives slug as prop and caches the fetched content
async function CachedBlogPost({ slug }: { slug: string }) {
  "use cache";
  cacheLife("weeks");

  // slug is part of the cache key
  const substackUrl = `https://hugodemenez.substack.com/p/${slug}`;
  // into.md usage: https://into.md/https://hugodemenez.substack.com/p/slug
  const intoMdUrl = `https://into.md/${substackUrl}`;

  try {
    const res = await fetch(intoMdUrl);

    if (!res.ok) {
      console.error(`Failed to fetch post from ${intoMdUrl}: ${res.status}`);
      notFound();
    }

    const markdown = await res.text();

    // Preprocess markdown to fix specific formatting issues from into.md
    const processedMarkdown = markdown
      // Fix images wrapped in broken links with newlines: [ \n ![](...) \n ](...)
      .replace(/\[\s*(!\[.*?\]\(.*?\))\s*\]\(.*?\)/g, "$1")
      // Convert Twitter/X links (plain or markdown format) on their own line to Tweet components
      // Match plain links: https://x.com/user/status/123456
      .replace(
        /^[ \t]*https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \n]*)?[ \t\r]*$/gm,
        '\n<Tweet id="$1" />\n'
      )
      // Match markdown links: [text](https://x.com/user/status/123456)
      .replace(
        /^[ \t]*\[.*?\]\(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \n\)]*)?\)[ \t\r]*$/gm,
        '\n<Tweet id="$1" />\n'
      )
      // Match markdown links anywhere: [text](https://x.com/user/status/123456)
      .replace(
        /\[.*?\]\(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \n\)]*)?\)/g,
        '\n\n<Tweet id="$1" />\n\n'
      )
      // Match inline links: text https://x.com/user/status/123456
      .replace(
        /(^|[^\[(])(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \s\n)]*)?)/g,
        '$1\n\n<Tweet id="$3" />\n\n'
      );

    // Compile MDX
    const { content } = await compileMDX({
      source: processedMarkdown,
      options: { parseFrontmatter: true },
      components: mdxComponents,
    });
    return (
      <article className="prose prose-stone dark:prose-invert">
        {content}
      </article>
    );
  } catch (error) {
    console.error("Error fetching blog post:", error);
    notFound();
  }
}
