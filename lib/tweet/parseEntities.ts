import type { Tweet, Indices, UrlEntity, UserMentionEntity, HashtagEntity } from './types';

type TextSegment = {
  type: 'text';
  text: string;
};

type LinkSegment = {
  type: 'url' | 'mention' | 'hashtag';
  text: string;
  href: string;
};

export type TweetSegment = TextSegment | LinkSegment;

/**
 * Parses tweet text and entities into segments for rendering.
 * Handles URLs, mentions (@username), and hashtags.
 */
export function parseTweetEntities(tweet: Tweet): TweetSegment[] {
  const { text, entities, display_text_range } = tweet;
  const textMap = Array.from(text); // Unicode-aware character array
  const startIndex = display_text_range?.[0] ?? 0;
  const endIndex = display_text_range?.[1] ?? text.length;

  // Collect all entities with their positions
  const allEntities: Array<{
    indices: Indices;
    type: 'url' | 'mention' | 'hashtag';
    href: string;
    displayText: string;
  }> = [];
  
  const textToCheck = textMap.slice(startIndex, endIndex).join('');
  
  // Fallback: Extract URLs directly from text if entities.urls is empty
  // This handles cases where Twitter's API doesn't include URLs in entities
  if (!entities.urls || entities.urls.length === 0) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlMatches = Array.from(textToCheck.matchAll(urlRegex));
    
    if (urlMatches.length > 0) {
      // Create URL entities from text matches
      for (const match of urlMatches) {
        if (match.index !== undefined) {
          const urlStart = startIndex + match.index;
          const urlEnd = urlStart + match[0].length;
          allEntities.push({
            indices: [urlStart, urlEnd],
            type: 'url',
            href: match[0], // Use the URL as-is (might be shortened t.co URL)
            displayText: match[0],
          });
        }
      }
    }
  }

  // Process URLs
  if (entities.urls && entities.urls.length > 0) {
    for (const url of entities.urls) {
      // Skip if URL is completely outside display_text_range
      // But allow URLs that overlap with the display range
      if (url.indices[1] <= startIndex || url.indices[0] >= endIndex) {
        continue;
      }
      // Skip media URLs (they're handled separately as images)
      // Check both entities.media and mediaDetails
      const isMediaUrl =
        entities.media?.some((m) => {
          // Match by expanded_url or by checking if it's a media URL pattern
          return m.expanded_url === url.expanded_url || 
                 m.url === url.url ||
                 (m.media_url_https && url.expanded_url.includes(m.media_url_https));
        }) ||
        tweet.mediaDetails?.some((m) => {
          return m.media_url_https === url.expanded_url ||
                 url.expanded_url.includes(m.media_url_https);
        });
      if (isMediaUrl) {
        continue;
      }
      allEntities.push({
        indices: url.indices,
        type: 'url',
        href: url.expanded_url,
        displayText: url.display_url, // Used for reference, actual text comes from tweet text via indices
      });
    }
  }

  // Process mentions
  if (entities.user_mentions) {
    for (const mention of entities.user_mentions) {
      // Skip if mention is outside display_text_range
      if (mention.indices[0] < startIndex || mention.indices[1] > endIndex) {
        continue;
      }
      allEntities.push({
        indices: mention.indices,
        type: 'mention',
        href: `https://x.com/${mention.screen_name}`,
        displayText: `@${mention.screen_name}`,
      });
    }
  }

  // Process hashtags
  if (entities.hashtags) {
    for (const hashtag of entities.hashtags) {
      // Skip if hashtag is outside display_text_range
      if (hashtag.indices[0] < startIndex || hashtag.indices[1] > endIndex) {
        continue;
      }
      allEntities.push({
        indices: hashtag.indices,
        type: 'hashtag',
        href: `https://x.com/hashtag/${hashtag.text}`,
        displayText: `#${hashtag.text}`,
      });
    }
  }

  // Sort entities by start position
  allEntities.sort((a, b) => a.indices[0] - b.indices[0]);

  // Build segments
  const segments: TweetSegment[] = [];
  let currentIndex = startIndex;

  for (const entity of allEntities) {
    // Add text before this entity
    if (entity.indices[0] > currentIndex) {
      const textBefore = textMap.slice(currentIndex, entity.indices[0]).join('');
      if (textBefore) {
        segments.push({ type: 'text', text: textBefore });
      }
    }

    // Add the entity as a link
    const entityText = textMap.slice(entity.indices[0], entity.indices[1]).join('');
    segments.push({
      type: entity.type,
      text: entityText,
      href: entity.href,
    });

    currentIndex = entity.indices[1];
  }

  // Add remaining text
  if (currentIndex < endIndex) {
    const remainingText = textMap.slice(currentIndex, endIndex).join('');
    if (remainingText) {
      segments.push({ type: 'text', text: remainingText });
    }
  }

  // If no entities were processed, return the whole text as a single segment
  if (segments.length === 0) {
    segments.push({ type: 'text', text: textMap.slice(startIndex, endIndex).join('') });
  }

  return segments;
}

