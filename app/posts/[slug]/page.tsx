import { Suspense } from "react";
import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/app/_components/mdx-components-list";
import { cacheLife } from "next/cache";
import { PostBodyReveal } from "@/app/_components/post-body-reveal";
import { ImageGallery } from "./_components/image-gallery";
import { PostHeader } from "./_components/post-header";
import Link from "next/link";
import { getSubstackPost } from "@/server/substack-feed";

const CONTENT_DIR = path.join(process.cwd(), "content", "substack");

// The pinned header renders title and date from frontmatter, so drop the body's
// own copies. Both replaces are non-global on purpose: 18 posts use additional
// `#` headings mid-article and those must survive.
function stripLeadingTitle(source: string): string {
  return source
    .replace(/^#[ \t]+.*(\r?\n)?/m, "")
    .replace(/<Date\b[^>]*\/>[ \t]*(\r?\n)?/, "");
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => ({ slug: f.replace(".mdx", "") }));
}

async function getCachedPost(slug: string) {
  "use cache";
  cacheLife("max");
  return getSubstackPost(slug);
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const post = await getCachedPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="prose prose-stone dark:prose-invert wrap-break-word">
      {/* Title, date, and stamp stay out of the MDX Suspense boundary so they
          exist in the first paint. Shared-element morphs only pair when the
          destination nodes land in the same commit as the navigation. */}
      <PostHeader post={post} />
      <PostBodyReveal>
        <Suspense
          fallback={<div className="text-muted animate-pulse">Loading...</div>}
        >
          <CachedPostBody slug={slug} />
        </Suspense>
        <Link
          href={`https://hugodemenez.substack.com/p/${slug}`}
          className="text-muted hover:text-accent transition-colors flex items-center gap-2 text-sm cursor-pointer underline underline-offset-2"
        >
          View on Substack
        </Link>
        <ImageGallery />
      </PostBodyReveal>
    </article>
  );
}

async function CachedPostBody({ slug }: { slug: string }) {
  "use cache";
  cacheLife("max");

  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const source = fs.readFileSync(filePath, "utf-8");

  try {
    const { content } = await compileMDX({
      source: stripLeadingTitle(source),
      options: { parseFrontmatter: true },
      components: mdxComponents,
    });

    return content;
  } catch (error) {
    console.error("Error compiling blog post:", error);
    notFound();
  }
}
