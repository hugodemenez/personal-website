import { Suspense } from "react";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx-components-list";
import { cacheLife } from "next/cache";
import { fetchSubstackPosts } from "@/server/substack-feed";
import { ImageGalleryProvider } from "@/components/image-gallery-context";
import { ImageGalleryDialog } from "@/components/image-gallery-dialog";
import type { ImageData } from "@/components/image-gallery-context";

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

  return <CachedBlogPost slug={slug} />;
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

  // Extract images from markdown before processing
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: ImageData[] = [];
  let match;
  while ((match = imageRegex.exec(markdown)) !== null) {
    const alt = match[1] || "";
    const src = match[2];
    if (src) {
      images.push({ src, alt });
    }
  }

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
      <ImageGalleryProvider images={images}>
        <article className="prose prose-stone dark:prose-invert wrap-break-word">
          {content}
        </article>
        <ImageGalleryDialog />
      </ImageGalleryProvider>
    );
  } catch (error) {
    console.error("Error fetching blog post:", error);
    notFound();
  }
}
