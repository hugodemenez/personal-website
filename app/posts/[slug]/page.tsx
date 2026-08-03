import { Suspense } from "react";
import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/app/_components/mdx-components-list";
import { cacheLife } from "next/cache";
import { ImageGallery } from "./_components/image-gallery";
import Link from "next/link";
import { PinnedShell } from "@/app/_components/pinned-shell";

const CONTENT_DIR = path.join(process.cwd(), "content", "substack");

// The pinned header renders title and date from frontmatter, so drop the body's
// own copies. Both replaces are non-global on purpose: 18 posts use additional
// `#` headings mid-article and those must survive.
function stripLeadingTitle(source: string): string {
  return source
    .replace(/^#[ \t]+.*(\r?\n)?/m, "")
    .replace(/<Date\b[^>]*\/>[ \t]*(\r?\n)?/, "");
}

function formatPostDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
    const { content, frontmatter } = await compileMDX<{
      title?: string;
      date?: string;
    }>({
      source: stripLeadingTitle(source),
      options: { parseFrontmatter: true },
      components: mdxComponents,
    });

    return (
      <article className="prose prose-stone dark:prose-invert wrap-break-word">
        {/* Title and date come from frontmatter and are pinned, so they stay
            visible while the article scrolls. The matching heading and <Date />
            are stripped from the body to avoid rendering them twice. */}
        <PinnedShell
          className="relative z-30 -mx-4 mb-6 px-4 pb-3 pt-2"
          offset={52}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-background"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-full h-8 bg-linear-to-b from-background to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />
          <div className="relative">
            {/* Same serif treatment as "Hugo Demenez" and the Writing heading —
                one step down in scale because this one is pinned. */}
            <h1 className="mb-0 mt-4 font-serif text-3xl leading-[1.05] tracking-[-0.035em] text-foreground sm:text-4xl">
              {frontmatter.title}
            </h1>
            {frontmatter.date ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <time
                  className="text-sm font-medium tracking-wide text-muted"
                  dateTime={frontmatter.date}
                >
                  {formatPostDate(frontmatter.date)}
                </time>
              </div>
            ) : null}
          </div>
        </PinnedShell>
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
