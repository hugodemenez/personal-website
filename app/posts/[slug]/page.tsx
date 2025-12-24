import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx-components-list";
import { cacheLife } from "next/cache";
import { fetchSubstackPosts } from "@/server/substack-feed";
import { fetchSubstackPostBySlug } from "@/server/substack-post";
import { htmlToMarkdown } from "@/lib/html-to-markdown";
import { ImageGallery } from "@/components/image-gallery";
import Link from "next/link";

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

  // Fetch post data from Substack API
  const postData = await fetchSubstackPostBySlug(slug);

  if (!postData) {
    console.error(`Failed to fetch post ${slug} from Substack API`);
    notFound();
  }

  // Check if content is available (not paywalled or missing)
  const bodyHtml = postData.body_html;
  if (!bodyHtml || bodyHtml.trim() === "") {
    // Redirect to canonical Substack URL if content is missing/paywalled
    const canonicalUrl =
      postData.canonical_url || `https://hugodemenez.substack.com/p/${slug}`;
    redirect(canonicalUrl);
  }

  // Convert HTML to Markdown
  const markdown = htmlToMarkdown(bodyHtml);
  // Prepend the title as an h1 heading if it exists
  let finalMarkdown = markdown;
  if (postData.title && postData.title.trim()) {
    // Always ensure title is at the very start of the markdown
    // Remove any existing heading at the start, then prepend our title
    const trimmedMarkdown = markdown.trim();
    
    // Check if markdown starts with a heading (^ without 'm' flag = start of string only)
    if (/^#+\s/.test(trimmedMarkdown)) {
      // Remove the first heading line (and any trailing newlines on that line)
      // Keep any content that follows
      finalMarkdown = trimmedMarkdown.replace(/^#+\s+[^\n]*\n?/, '');
      // Prepend title with proper spacing
      finalMarkdown = `# ${postData.title.trim()}\n\n${finalMarkdown.trimStart()}`;
    } else {
      // No heading at start, just prepend the title
      finalMarkdown = `# ${postData.title.trim()}\n\n${trimmedMarkdown}`;
    }
  }

  // Preprocess markdown to fix specific formatting issues
  let processedMarkdown = finalMarkdown
    // Fix images wrapped in broken links with newlines: [ \n ![](...) \n ](...)
    .replace(/\[\s*(!\[.*?\]\(.*?\))\s*\]\(.*?\)/g, "$1")
    // Convert Twitter/X links (plain or markdown format) on their own line to Tweet components
    // Match plain links: https://x.com/user/status/123456
    .replace(
      /\[.*?\]\(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^\s\)]*)?\)/g,
      '\n<Tweet id="$1" />\n'
    );

  // Get date from substackPost data
  const substackPost = await fetchSubstackPosts().then((posts) =>
    posts.find((post) => post.slug === slug)
  );
  const date = substackPost?.pubDate;
  if (date) {
    // Insert date below the first markdown heading (# ...) using custom Date component
    processedMarkdown = processedMarkdown.replace(
      /^(# .+)(\r?\n)/,
      `$1$2\n<Date date="${date}" />\n\n`
    );
  }

  try {
    // Compile MDX
    const { content } = await compileMDX({
      source: processedMarkdown,
      options: { parseFrontmatter: true },
      components: mdxComponents,
    });
    return (
      <>
      <article className="prose prose-stone dark:prose-invert wrap-break-word">
        {content}
        <Link href={`https://hugodemenez.substack.com/p/${slug}`}>View on Substack</Link>
      <ImageGallery />
      </article>
      </>
    );
  } catch (error) {
    console.error("Error fetching blog post:", error);
    notFound();
  }
}
