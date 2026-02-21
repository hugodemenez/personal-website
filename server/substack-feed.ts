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

export async function fetchSubstackPosts(): Promise<SubstackPost[]> {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  const posts: SubstackPost[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    const fm = parseFrontmatter(content);
    const slug = file.replace(".mdx", "");

    posts.push({
      title: fm.title || slug.replace(/-/g, " "),
      link: fm.link || `https://hugodemenez.substack.com/p/${slug}`,
      slug,
      image: fm.image || undefined,
      pubDate: fm.date || "1970-01-01T00:00:00.000Z",
      description: fm.description || undefined,
      available: fm.available !== "false",
    });
  }

  posts.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
  return posts;
}
