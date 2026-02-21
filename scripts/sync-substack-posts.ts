import fs from "node:fs";
import path from "node:path";
import { htmlToMarkdown } from "../lib/html-to-markdown";

const SUBSTACK_BASE_URL = "https://hugodemenez.substack.com";
const CONTENT_DIR = path.join(process.cwd(), "content", "substack");

interface ApiPost {
  id: number;
  slug: string;
  title?: string;
  post_date?: string;
  canonical_url?: string | null;
  cover_image?: string | null;
  description?: string | null;
  truncated_body_text?: string | null;
  is_published?: boolean;
}

interface FullPost {
  slug: string;
  title?: string;
  post_date?: string;
  canonical_url?: string | null;
  cover_image?: string | null;
  description?: string | null;
  body_html?: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function fetchPostsList(): Promise<ApiPost[]> {
  const postsMap = new Map<string, ApiPost>();

  // Fetch from archive (paginated, older posts)
  const archiveUrl = new URL(`${SUBSTACK_BASE_URL}/api/v1/archive`);
  archiveUrl.searchParams.set("sort", "new");
  archiveUrl.searchParams.set("limit", "50");
  let offset = 0;

  while (true) {
    archiveUrl.searchParams.set("offset", offset.toString());
    const res = await fetch(archiveUrl.toString());
    if (!res.ok) {
      console.warn(`Archive API failed: ${res.status}`);
      break;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    for (const item of data as ApiPost[]) {
      postsMap.set(item.slug, item);
    }
    offset += data.length;
  }

  // Fetch from posts API (latest, overrides archive)
  const postsRes = await fetch(`${SUBSTACK_BASE_URL}/api/v1/posts`);
  if (postsRes.ok) {
    const data = await postsRes.json();
    if (Array.isArray(data)) {
      for (const item of data as ApiPost[]) {
        if (item.is_published !== false) {
          postsMap.set(item.slug, item);
        }
      }
    }
  }

  return Array.from(postsMap.values()).sort((a, b) => {
    const dateA = new Date(a.post_date || "1970-01-01").getTime();
    const dateB = new Date(b.post_date || "1970-01-01").getTime();
    return dateB - dateA;
  });
}

async function fetchPostContent(
  slug: string,
  retries = 3
): Promise<FullPost | null> {
  const endpoint = `${SUBSTACK_BASE_URL}/api/v1/posts/${slug}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 5000));
    }

    try {
      const res = await fetch(endpoint, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (res.status === 404) return null;

      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        if (retryAfter) {
          const seconds = parseInt(retryAfter, 10);
          if (!isNaN(seconds)) await sleep(seconds * 1000);
          else await sleep(Math.min(2000 * Math.pow(2, attempt), 10000));
        } else {
          await sleep(Math.min(2000 * Math.pow(2, attempt), 10000));
        }
        if (attempt < retries) continue;
        console.warn(`Rate limited: ${slug}`);
        return null;
      }

      if (!res.ok) {
        console.warn(`Failed to fetch ${slug}: ${res.status}`);
        return null;
      }

      return (await res.json()) as FullPost;
    } catch (error) {
      if (attempt < retries) continue;
      console.warn(`Error fetching ${slug}:`, error);
      return null;
    }
  }
  return null;
}

function buildMdxContent(listPost: ApiPost, fullPost: FullPost | null): string {
  const title = listPost.title || listPost.slug.replace(/-/g, " ");
  const date = listPost.post_date || "1970-01-01T00:00:00.000Z";
  const link =
    listPost.canonical_url || `${SUBSTACK_BASE_URL}/p/${listPost.slug}`;
  const image = listPost.cover_image || "";

  const rawDescription =
    listPost.truncated_body_text ?? listPost.description ?? "";
  const cleanedDescription = rawDescription.trim();
  const description =
    cleanedDescription.length > 150
      ? `${cleanedDescription.slice(0, 150).trim()}...`
      : cleanedDescription;

  const bodyHtml = fullPost?.body_html;
  const available = !!(bodyHtml && bodyHtml.trim());

  const frontmatter = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    `date: "${date}"`,
    `description: "${description.replace(/"/g, '\\"')}"`,
    `available: ${available}`,
    `image: "${image}"`,
    `link: "${link}"`,
    "---",
  ].join("\n");

  if (!available) {
    return `${frontmatter}\n\n# ${title}\n\nThis post is available on [Substack](${link}).\n`;
  }

  let markdown = htmlToMarkdown(bodyHtml!);

  // Prepend title (same logic as the old page.tsx)
  const trimmedMarkdown = markdown.trim();
  if (/^#+\s/.test(trimmedMarkdown)) {
    markdown = trimmedMarkdown.replace(/^#+\s+[^\n]*\n?/, "");
    markdown = `# ${title.trim()}\n\n${markdown.trimStart()}`;
  } else {
    markdown = `# ${title.trim()}\n\n${trimmedMarkdown}`;
  }

  // Fix images wrapped in broken links
  markdown = markdown.replace(
    /\[\s*(!\[.*?\]\(.*?\))\s*\]\(.*?\)/g,
    "$1"
  );

  // Convert Twitter/X links to Tweet components
  markdown = markdown.replace(
    /\[.*?\]\(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^\s\)]*)?\)/g,
    '\n<Tweet id="$1" />\n'
  );

  // Insert Date component below the first heading
  markdown = markdown.replace(
    /^(# .+)(\r?\n)/,
    `$1$2\n<Date date="${date}" />\n\n`
  );

  return `${frontmatter}\n\n${markdown}\n`;
}

async function main() {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  console.log("Fetching posts list from Substack...");
  const posts = await fetchPostsList();
  console.log(`Found ${posts.length} posts`);

  // Read existing MDX files
  const existingFiles = new Set<string>();
  for (const file of fs.readdirSync(CONTENT_DIR)) {
    if (file.endsWith(".mdx")) {
      existingFiles.add(file.replace(".mdx", ""));
    }
  }

  const apiSlugs = new Set(posts.map((p) => p.slug));

  // Delete files for posts no longer in API (unpublished)
  for (const slug of existingFiles) {
    if (!apiSlugs.has(slug)) {
      console.log(`Deleting removed post: ${slug}`);
      fs.unlinkSync(path.join(CONTENT_DIR, `${slug}.mdx`));
    }
  }

  // Sync posts (incremental: skip if date unchanged)
  let synced = 0;
  let skipped = 0;

  for (const post of posts) {
    const filePath = path.join(CONTENT_DIR, `${post.slug}.mdx`);

    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, "utf-8");
      const fm = parseFrontmatter(existing);
      if (fm.date === post.post_date) {
        skipped++;
        continue;
      }
    }

    console.log(`Syncing: ${post.slug}`);
    const fullPost = await fetchPostContent(post.slug);
    const mdxContent = buildMdxContent(post, fullPost);
    fs.writeFileSync(filePath, mdxContent, "utf-8");
    synced++;

    await sleep(200);
  }

  console.log(
    `\nDone! Synced: ${synced}, Skipped (up-to-date): ${skipped}, Total: ${posts.length}`
  );
}

main().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
