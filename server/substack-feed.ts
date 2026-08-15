import fs from "node:fs";
import path from "node:path";
import type { SubstackPost } from "@/types/substack-post";

const CONTENT_DIR = path.join(process.cwd(), "content", "substack");

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fm[key] = value;
  }
  return fm;
}

function toPost(slug: string, fm: Record<string, string>): SubstackPost {
  return {
    title: fm.title || slug.replace(/-/g, " "),
    link: fm.link || `https://hugodemenez.substack.com/p/${slug}`,
    slug,
    image: fm.image || undefined,
    pubDate: fm.date || "1970-01-01T00:00:00.000Z",
    description: fm.description || undefined,
    available: fm.available !== "false",
  };
}

export function getSubstackPost(slug: string): SubstackPost | null {
  if (!slug || slug.includes("/") || slug.includes("..")) return null;

  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  return toPost(slug, parseFrontmatter(fs.readFileSync(filePath, "utf-8")));
}

export async function fetchSubstackPosts(): Promise<SubstackPost[]> {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  const posts = files.map((file) => {
    const slug = file.replace(".mdx", "");
    const content = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    return toPost(slug, parseFrontmatter(content));
  });

  posts.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
  return posts;
}
