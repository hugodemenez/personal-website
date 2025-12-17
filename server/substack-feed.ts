"use server";
import { cacheLife } from "next/cache";
import type { SubstackPost } from "@/types/substack-post";

const SUBSTACK_ARCHIVE_API_URL =
  "https://hugodemenez.substack.com/api/v1/archive";


interface ArchiveApiPost {
  id: number;
  slug: string;
  title?: string;
  post_date?: string;
  canonical_url?: string | null;
  cover_image?: string | null;
  description?: string | null;
  truncated_body_text?: string | null;
}

async function fetchArchiveFromApi(): Promise<SubstackPost[]> {
  const posts: SubstackPost[] = [];

  const url = new URL(SUBSTACK_ARCHIVE_API_URL);
  url.searchParams.set("sort", "new");
  // Substack API limit is 50 posts per request
  url.searchParams.set("limit", "50");
  // Fetch posts from the api until there are no more posts
  while (true) {
    url.searchParams.set("offset", posts.length.toString());

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(`Failed to fetch archive API: ${res.status}`);
      break;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      // There is no posts in the archive
      break;
    }

    // Parse the posts
    for (const item of data as ArchiveApiPost[]) {
      const title = item.title || item.slug.replace(/-/g, " ");
      const link =
        item.canonical_url || `https://hugodemenez.substack.com/p/${item.slug}`;
      const image = item.cover_image ?? undefined;

      const rawDescription = item.truncated_body_text ?? item.description ?? "";
      const cleanedDescription = rawDescription ? rawDescription.trim() : "";
      const description =
        cleanedDescription.length > 150
          ? `${cleanedDescription.slice(0, 150).trim()}...`
          : cleanedDescription || undefined;

      posts.push({
        title,
        link,
        slug: item.slug,
        image,
        pubDate: item.post_date || "1970-01-01T00:00:00.000Z",
        description,
      });
    }
  }
  return posts;
}

// Cache the function to prevent duplicate fetches across workers during build
export async function fetchSubstackPosts(): Promise<SubstackPost[]> {
  "use cache";
  cacheLife("hours");

  try {
    return await fetchArchiveFromApi();
  } catch (error) {
    console.warn("Failed to fetch Substack posts from archive API", error);
    return [];
  }
}
