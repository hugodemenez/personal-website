import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx-components-list";
import { cacheLife } from "next/cache";
import { fetchSubstackPosts } from "@/server/substack-feed";
import { fetchSubstackPostBySlug, type SubstackPostData } from "@/server/substack-post";
import { htmlToMarkdown } from "@/lib/html-to-markdown";
import { ImageGallery } from "@/components/image-gallery";
import { deriveHeroImage } from "@/lib/hero-image";
import { HeroSharpViewer } from "@/components/sharp/hero-sharp-viewer";
import { PostDrawer } from "@/components/posts/post-drawer";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Build-time cache to store fetched post data and avoid duplicate fetches
// Note: We can't pass data through params because Next.js route params are strictly
// tied to the folder structure ([slug] only). The cache persists during build time.
const buildTimePostCache = new Map<string, SubstackPostData>();

// Build-time static params for "known" Substack posts
// Only includes posts that can be successfully fetched (excludes rate-limited or failed posts)
export async function generateStaticParams() {
  const posts = await fetchSubstackPosts();
  const validSlugs: { slug: string }[] = [];

  // Fetch each post individually to verify it can be accessed
  // If rate limited or failed, exclude it from static generation
  // Store successfully fetched posts in cache to avoid refetching
  for (const post of posts) {
    const postData = await fetchSubstackPostBySlug(post.slug);
    if (postData) {
      // Store in cache for reuse during page generation
      buildTimePostCache.set(post.slug, postData);
      validSlugs.push({ slug: post.slug });
    } else {
      console.warn(
        `Excluding post ${post.slug} from static generation (failed to fetch or rate limited)`
      );
    }
    // Add a small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return validSlugs;
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

  // Check build-time cache first, then fetch if not available
  const prefetchedData = buildTimePostCache.get(slug);
  let postData = prefetchedData;
  if (!postData) {
    const fetchedData = await fetchSubstackPostBySlug(slug, 3);
    if (fetchedData) {
      postData = fetchedData;
    }
  }

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

    const heroImage = deriveHeroImage(postData);

    return (
      <div className="relative min-h-screen bg-background">
        <div className="relative flex min-h-screen flex-col lg:flex-row">
          <div className="relative h-[52vh] w-full overflow-hidden border-b border-border lg:h-screen lg:flex-1 lg:border-0">
            <HeroSharpViewer
              slug={slug}
              heroImageUrl={heroImage.proxiedImageUrl}
              originalImageUrl={heroImage.imageUrl}
            />
          </div>
          <PostDrawer slug={slug} title={postData.title} heroSource={heroImage.source}>
            <>
              {content}
              <ImageGallery />
            </>
          </PostDrawer>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching blog post:", error);
    notFound();
  }
}
