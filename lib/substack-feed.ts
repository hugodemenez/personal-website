const SUBSTACK_FEED_URL = 'https://hugodemenez.substack.com/feed';

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
  const feedRes = await fetch(SUBSTACK_FEED_URL, {
    next: { revalidate: 3600 },
  });

  if (!feedRes.ok) {
    throw new Error(`Failed to fetch feed: ${feedRes.status}`);
  }

  const xml = await feedRes.text();
  return parseRSSFeed(xml);
}


