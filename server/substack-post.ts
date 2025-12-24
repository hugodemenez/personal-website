"use server";
import { cacheLife } from "next/cache";

const SUBSTACK_BASE_URL = "https://hugodemenez.substack.com";

export interface SubstackPostData {
  id: number;
  slug: string;
  title?: string;
  post_date?: string;
  canonical_url?: string | null;
  cover_image?: string | null;
  description?: string | null;
  body_html?: string | null;
  audience?: string;
  [key: string]: unknown;
}

/**
 * Sleeps for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a single Substack post by slug from the API with retry logic.
 * Similar to substack_api/post.py's Post.get_content() approach.
 *
 * @param slug - The post slug (last part of the URL path)
 * @param retries - Number of retry attempts (default: 3)
 * @returns Post data including body_html, or null if not found
 */
export async function fetchSubstackPostBySlug(
  slug: string,
  retries = 3
): Promise<SubstackPostData | null> {
  "use cache";
  cacheLife("hours");

  const endpoint = `${SUBSTACK_BASE_URL}/api/v1/posts/${slug}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add delay between requests to avoid rate limiting
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await sleep(delayMs);
      } else {
        // Small random delay on first attempt to help space out parallel requests during build
        // Random delay between 100-300ms to avoid thundering herd
        const randomDelay = 100 + Math.random() * 200;
        await sleep(randomDelay);
      }

      const res = await fetch(endpoint, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36",
        },
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        if (res.status === 404) {
          return null;
        }

        // Handle rate limiting (429) with retry
        if (res.status === 429) {
          if (attempt < retries) {
            // Check for Retry-After header
            const retryAfter = res.headers.get("Retry-After");
            if (retryAfter) {
              const delaySeconds = parseInt(retryAfter, 10);
              if (!isNaN(delaySeconds) && delaySeconds > 0) {
                await sleep(delaySeconds * 1000);
              } else {
                // If no valid Retry-After, use exponential backoff
                await sleep(Math.min(2000 * Math.pow(2, attempt), 10000));
              }
            } else {
              // If no Retry-After header, use exponential backoff
              await sleep(Math.min(2000 * Math.pow(2, attempt), 10000));
            }
            continue; // Retry
          }
          console.warn(
            `Rate limited fetching Substack post ${slug} after ${retries + 1} attempts`
          );
          return null;
        }

        // For other errors, log and return null
        console.warn(`Failed to fetch Substack post ${slug}: ${res.status}`);
        return null;
      }

      const data = (await res.json()) as SubstackPostData;
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/846f0996-acea-46f9-b2c1-1da316e5b2c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'substack-post.ts:101',message:'Raw API response',data:{slug,status:res.status,dataKeys:Object.keys(data),title:data.title,post_date:data.post_date,hasBodyHtml:!!data.body_html,allFields:data},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'title-location'})}).catch(()=>{});
      // #endregion
      
      return data;
    } catch (error) {
      if (attempt < retries) {
        // Retry on network errors
        continue;
      }
      console.warn(`Error fetching Substack post ${slug}:`, error);
      return null;
    }
  }

  return null;
}

