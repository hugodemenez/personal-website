import { Suspense } from "react";
import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx-components-list";
import { cacheLife } from "next/cache";
import { ImageGallery } from "@/components/image-gallery";
import Link from "next/link";

const CONTENT_DIR = path.join(process.cwd(), "content", "substack");

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

async function CachedBlogPost({ slug }: { slug: string }) {
  "use cache";
  cacheLife("max");

  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const source = fs.readFileSync(filePath, "utf-8");

  try {
    const { content } = await compileMDX({
      source,
      options: { parseFrontmatter: true },
      components: mdxComponents,
    });

    return (
      <article className="prose prose-stone dark:prose-invert wrap-break-word">
        {content}
        <Link
          href={`https://hugodemenez.substack.com/p/${slug}`}
          className="text-muted hover:text-accent transition-colors flex items-center gap-2 text-sm cursor-pointer underline underline-offset-2"
        >
          View on Substack
        </Link>
        <ImageGallery />
      </article>
    );
  } catch (error) {
    console.error("Error compiling blog post:", error);
    notFound();
  }
}
