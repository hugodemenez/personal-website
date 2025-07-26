import { XMLParser } from 'fast-xml-parser';
import fs from 'fs/promises';
import path from 'path';

const SUBSTACK_FEED_URL = 'https://hugodemenez.substack.com/feed';
const CACHE_DIR = path.join(process.cwd(), '.next/cache/substack');

export interface SubstackPost {
  title: string;
  link: string;
  image?: string;
  pubDate: string;
  description?: string;
  content?: string;
  author?: string;
  guid?: string;
  slug?: string;
}

export interface SubstackCache {
  posts: SubstackPost[];
  lastUpdated: string;
  version: string;
}

// Enhanced content extraction from HTML
function extractContentFromHtml(html: string): {
  text: string;
  image?: string;
  excerpt: string;
} {
  if (!html) return { text: '', excerpt: '' };

  // Extract images
  const imageMatch = html.match(/<img[^>]+src=["']([^"'>]+)["']/i);
  const image = imageMatch ? imageMatch[1] : undefined;

  // Remove HTML tags and extract clean text
  const cleanText = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Create excerpt (first 200 characters)
  const excerpt = cleanText.length > 200 
    ? cleanText.substring(0, 200) + '...'
    : cleanText;

  return {
    text: cleanText,
    image,
    excerpt
  };
}

// Generate URL slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// Parse and enhance Substack posts
function parseSubstackPosts(items: any[]): SubstackPost[] {
  return items.map((item: any) => {
    const contentEncoded = item['content:encoded'] || '';
    const { text, image: extractedImage, excerpt } = extractContentFromHtml(contentEncoded);
    
    // Try multiple sources for images
    let image = extractedImage;
    if (!image && item['media:content']?.['@_url']) {
      image = item['media:content']['@_url'];
    }
    if (!image && item.enclosure?.['@_url']) {
      image = item.enclosure['@_url'];
    }

    const title = item.title || 'Untitled';
    const slug = generateSlug(title);

    return {
      title,
      link: item.link || '',
      image,
      pubDate: item.pubDate || new Date().toISOString(),
      description: item.description || excerpt,
      content: text,
      author: item['dc:creator'] || item.author || 'Hugo Demenez',
      guid: item.guid?.['#text'] || item.guid || item.link,
      slug,
    };
  });
}

// Ensure cache directory exists
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Read cached data
async function readCache(): Promise<SubstackCache | null> {
  try {
    const cachePath = path.join(CACHE_DIR, 'posts.json');
    const data = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

// Write cache data
async function writeCache(cache: SubstackCache): Promise<void> {
  await ensureCacheDir();
  const cachePath = path.join(CACHE_DIR, 'posts.json');
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
}

// Check if cache is still valid (1 hour)
function isCacheValid(cache: SubstackCache): boolean {
  const cacheTime = new Date(cache.lastUpdated).getTime();
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  return (now - cacheTime) < oneHour;
}

// Fetch fresh data from Substack
export async function fetchSubstackPosts(): Promise<SubstackPost[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const feedRes = await fetch(SUBSTACK_FEED_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NextJS-SubstackFeed/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    clearTimeout(timeoutId);

    if (!feedRes.ok) {
      throw new Error(`HTTP ${feedRes.status}: ${feedRes.statusText}`);
    }

    const xml = await feedRes.text();
    
    if (!xml || !xml.includes('<rss')) {
      throw new Error('Invalid RSS feed format');
    }

    const parser = new XMLParser({ 
      ignoreAttributes: false,
      parseAttributeValue: true,
      trimValues: true,
    });
    
    const json = parser.parse(xml);
    
    if (!json?.rss?.channel?.item) {
      throw new Error('No items found in RSS feed');
    }

    const items = Array.isArray(json.rss.channel.item) 
      ? json.rss.channel.item 
      : [json.rss.channel.item];

    const posts = parseSubstackPosts(items);
    
    // Sort by date (newest first)
    posts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    return posts.slice(0, 20); // Limit to 20 most recent posts
  } catch (error) {
    console.error('Error fetching Substack posts:', error);
    throw error;
  }
}

// Get cached posts or fetch fresh ones
export async function getSubstackPosts(forceRefresh = false): Promise<SubstackPost[]> {
  if (!forceRefresh) {
    const cache = await readCache();
    if (cache && isCacheValid(cache)) {
      return cache.posts;
    }
  }

  try {
    const posts = await fetchSubstackPosts();
    
    const cache: SubstackCache = {
      posts,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };

    await writeCache(cache);
    return posts;
  } catch (error) {
    // If fetch fails, try to return cached data as fallback
    const cache = await readCache();
    if (cache) {
      console.warn('Using cached Substack posts due to fetch error:', error);
      return cache.posts;
    }
    throw error;
  }
}

// Generate static props for Next.js pages
export async function getSubstackStaticProps() {
  try {
    const posts = await getSubstackPosts();
    
    return {
      props: {
        posts,
        lastUpdated: new Date().toISOString(),
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error('Error in getSubstackStaticProps:', error);
    
    return {
      props: {
        posts: [],
        lastUpdated: new Date().toISOString(),
      },
      revalidate: 300, // Retry in 5 minutes if there was an error
    };
  }
}