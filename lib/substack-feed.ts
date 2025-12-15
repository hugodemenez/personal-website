const SUBSTACK_FEED_URL = 'https://hugodemenez.substack.com/feed';
const SUBSTACK_ARCHIVE_URL = 'https://hugodemenez.substack.com/archive';

export interface SubstackPost {
  title: string;
  link: string;
  slug: string;
  image?: string;
  pubDate: string;
  description?: string;
}

function extractTextBetweenTags(xml: string, tagName: string): string | null {
  // Handle CDATA sections
  const regex = new RegExp(`<${tagName}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractAttribute(xml: string, tagName: string, attrName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]+${attrName}=["']([^"']+)["']`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function extractImageFromContent(content: string): string | null {
  const imgMatch = content.match(/<img[^>]+src=["']([^"'>]+)["']/i);
  return imgMatch ? imgMatch[1] : null;
}

function cleanDescription(html: string): string {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, '');
  // Decode HTML entities (basic ones)
  const decoded = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8212;/g, '—');
  
  // Truncate to ~150 chars
  if (decoded.length > 150) {
    return decoded.slice(0, 150).trim() + '...';
  }
  return decoded;
}

interface ArchivePost {
  slug: string;
  title?: string;
  pubDate?: string;
}

function parseArchivePage(html: string): ArchivePost[] {
  const posts: ArchivePost[] = [];
  const seenSlugs = new Set<string>();

  // Substack archive page often has structured post entries
  // Try multiple patterns to extract post information
  
  // Pattern 1: Try to match post entries with title and date
  // This pattern looks for common Substack archive HTML structure
  const postEntryRegex = /<a[^>]*href=["']\/p\/([a-zA-Z0-9_-]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = postEntryRegex.exec(html)) !== null) {
    const slug = match[1];
    const innerHtml = match[2];
    
    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      
      // Try to extract title from various possible locations
      let title: string | undefined;
      const h3Match = innerHtml.match(/<h3[^>]*>(.*?)<\/h3>/i);
      const h2Match = innerHtml.match(/<h2[^>]*>(.*?)<\/h2>/i);
      const h1Match = innerHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const titleMatch = h1Match || h2Match || h3Match;
      
      if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
      }
      
      // Try to extract date - look for time elements or date patterns
      // Search both inside the link and in surrounding context
      let pubDate: string | undefined;
      
      // Check for <time> element with datetime attribute
      const timeMatch = innerHtml.match(/<time[^>]*datetime=["']([^"']+)["']/i);
      if (timeMatch) {
        pubDate = timeMatch[1];
      } else {
        // Check in the surrounding context (within 500 chars after the link)
        const contextStart = match.index;
        const contextEnd = Math.min(contextStart + 500, html.length);
        const context = html.substring(contextStart, contextEnd);
        const contextTimeMatch = context.match(/<time[^>]*datetime=["']([^"']+)["']/i);
        if (contextTimeMatch) {
          pubDate = contextTimeMatch[1];
        }
      }
      
      posts.push({
        slug,
        title,
        pubDate,
      });
    }
  }

  // Pattern 2: If no posts found with pattern 1, fall back to simple link extraction
  if (posts.length === 0) {
    const postLinkRegex = /href=["']\/p\/([a-zA-Z0-9_-]+)["']/gi;
    while ((match = postLinkRegex.exec(html)) !== null) {
      const slug = match[1];
      if (!seenSlugs.has(slug)) {
        seenSlugs.add(slug);
        posts.push({ slug });
      }
    }
  }

  return posts;
}

function parseRSSFeed(xml: string): SubstackPost[] {
  const posts: SubstackPost[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1];

    const title = extractTextBetweenTags(itemXml, 'title');
    const link = extractTextBetweenTags(itemXml, 'link');
    const pubDate = extractTextBetweenTags(itemXml, 'pubDate');
    const descriptionRaw = extractTextBetweenTags(itemXml, 'description');
    const contentEncoded = extractTextBetweenTags(itemXml, 'content:encoded');

    if (!title || !link || !pubDate) continue;

    const slugMatch = link.match(/\/p\/([^/?]+)/);
    const slug = slugMatch ? slugMatch[1] : null;

    if (!slug) continue;

    // Prefer content:encoded for image extraction as it usually has the full content
    let image: string | undefined;

    const mediaContentMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
    if (mediaContentMatch) {
      image = mediaContentMatch[1];
    } else {
      const enclosureUrl = extractAttribute(itemXml, 'enclosure', 'url');
      if (enclosureUrl) {
        image = enclosureUrl;
      } else {
        if (contentEncoded) {
          const imgFromContent = extractImageFromContent(contentEncoded);
          if (imgFromContent) {
            image = imgFromContent;
          }
        }
      }
    }

    // Use description tag for the excerpt, falling back to stripped content:encoded
    let description = '';
    if (descriptionRaw) {
      description = cleanDescription(descriptionRaw);
    } else if (contentEncoded) {
      description = cleanDescription(contentEncoded);
    }

    posts.push({
      title,
      link,
      slug,
      image,
      pubDate,
      description,
    });
  }

  return posts;
}

export async function fetchSubstackPosts(): Promise<SubstackPost[]> {
  // Fetch both RSS feed and archive page in parallel
  const [feedRes, archiveRes] = await Promise.all([
    fetch(SUBSTACK_FEED_URL, {
      next: { revalidate: 3600 },
    }),
    fetch(SUBSTACK_ARCHIVE_URL, {
      next: { revalidate: 3600 },
    }),
  ]);

  // Parse RSS feed for detailed metadata (limited to ~20 posts)
  let rssPosts: SubstackPost[] = [];
  if (feedRes.ok) {
    const xml = await feedRes.text();
    rssPosts = parseRSSFeed(xml);
  } else {
    console.warn(`Failed to fetch RSS feed: ${feedRes.status}`);
  }

  // Parse archive page for all post slugs
  let archivePosts: ArchivePost[] = [];
  if (archiveRes.ok) {
    const html = await archiveRes.text();
    archivePosts = parseArchivePage(html);
  } else {
    console.warn(`Failed to fetch archive page: ${archiveRes.status}`);
  }

  // Create a map of RSS posts by slug for quick lookup
  const rssPostsBySlug = new Map<string, SubstackPost>();
  for (const post of rssPosts) {
    rssPostsBySlug.set(post.slug, post);
  }

  // Combine: use RSS data when available, otherwise create minimal post from archive
  const allPosts: SubstackPost[] = [];
  const processedSlugs = new Set<string>();

  // First, add all posts from archive
  for (const archivePost of archivePosts) {
    const rssPost = rssPostsBySlug.get(archivePost.slug);
    
    if (rssPost) {
      // Use full RSS post data
      allPosts.push(rssPost);
    } else {
      // Create minimal post from archive slug
      // Use epoch date as fallback to ensure these posts sort to the end
      // Most archive pages will have extracted dates, but this handles edge cases
      allPosts.push({
        title: archivePost.title || archivePost.slug.replace(/-/g, ' '),
        link: `https://hugodemenez.substack.com/p/${archivePost.slug}`,
        slug: archivePost.slug,
        pubDate: archivePost.pubDate || '1970-01-01T00:00:00.000Z',
        description: '',
      });
    }
    processedSlugs.add(archivePost.slug);
  }

  // Add any RSS posts not found in archive (shouldn't happen, but defensive)
  for (const rssPost of rssPosts) {
    if (!processedSlugs.has(rssPost.slug)) {
      allPosts.push(rssPost);
    }
  }

  // If we have no posts from archive, fall back to RSS only
  if (allPosts.length === 0 && rssPosts.length > 0) {
    return rssPosts;
  }

  return allPosts;
}


