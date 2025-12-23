'use cache';

import { cacheLife } from 'next/cache';
import { fetchTweet } from './syndication';
import type { Tweet } from './types';

/**
 * Fetches and caches a tweet using Next.js 16's stable "use cache" directive.
 * Uses cacheLife('max') for long-term caching (~30 days revalidate, never expires by time).
 */
export async function getTweet(id: string): Promise<Tweet | null> {
  cacheLife('max');

  const { data, tombstone, notFound } = await fetchTweet(id, {
    cache: 'force-cache',
  });

  if (notFound || tombstone || !data) {
    return null;
  }

  // The API returns the tweet directly
  const tweetData = data as any;
  
  // Ensure entities exist (they might be empty or missing)
  if (!tweetData.entities) {
    tweetData.entities = {};
  }
  
  // Ensure urls array exists even if empty
  if (!Array.isArray(tweetData.entities.urls)) {
    tweetData.entities.urls = [];
  }
  
  // Ensure user_mentions and hashtags arrays exist
  if (!Array.isArray(tweetData.entities.user_mentions)) {
    tweetData.entities.user_mentions = [];
  }
  if (!Array.isArray(tweetData.entities.hashtags)) {
    tweetData.entities.hashtags = [];
  }
  
  // Extract URL and card preview data if entities.urls is empty but card exists
  if ((!tweetData.entities.urls || tweetData.entities.urls.length === 0) && tweetData.card) {
    const cardUrl = tweetData.card.binding_values?.card_url?.string_value || 
                    tweetData.card.url;
    const vanityUrl = tweetData.card.binding_values?.vanity_url?.string_value;
    const title = tweetData.card.binding_values?.title?.string_value;
    const description = tweetData.card.binding_values?.description?.string_value;
    const domain = tweetData.card.binding_values?.domain?.string_value;
    
    // Extract image URL (prefer large image, fallback to smaller sizes)
    // Card images can be in image_value.url or image_value format
    const getImageUrl = (field: any): string | undefined => {
      if (!field) return undefined;
      if (typeof field === 'string') return field;
      if (field.image_value?.url) return field.image_value.url;
      if (field.image_value && typeof field.image_value === 'string') return field.image_value;
      if (field.string_value) return field.string_value;
      return undefined;
    };
    
    const imageUrl = 
      getImageUrl(tweetData.card.binding_values?.summary_photo_image_large) ||
      getImageUrl(tweetData.card.binding_values?.summary_photo_image_x_large) ||
      getImageUrl(tweetData.card.binding_values?.photo_image_full_size_large) ||
      getImageUrl(tweetData.card.binding_values?.thumbnail_image_large) ||
      getImageUrl(tweetData.card.binding_values?.summary_photo_image) ||
      getImageUrl(tweetData.card.binding_values?.thumbnail_image) ||
      getImageUrl(tweetData.card.binding_values?.photo_image_full_size);
    
    if (cardUrl) {
      // Find the position of the shortened URL in the text, or append it
      const shortUrl = tweetData.card.url; // e.g., https://t.co/jfU79gDxbq
      const urlIndex = tweetData.text.indexOf(shortUrl);
      
      if (urlIndex !== -1) {
        // URL exists in text, add it to entities
        if (!tweetData.entities.urls) {
          tweetData.entities.urls = [];
        }
        tweetData.entities.urls.push({
          url: shortUrl,
          expanded_url: cardUrl,
          display_url: vanityUrl || cardUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''),
          indices: [urlIndex, urlIndex + shortUrl.length] as [number, number],
        });
      }
      
      // Store card preview data for rendering
      (tweetData as any).cardUrl = cardUrl;
      (tweetData as any).cardDisplayUrl = vanityUrl || domain || cardUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      (tweetData as any).cardTitle = title;
      (tweetData as any).cardDescription = description;
      (tweetData as any).cardImage = imageUrl;
      (tweetData as any).cardDomain = domain;
    }
  }

  // Type assertion - the API returns the tweet structure we expect
  return tweetData as Tweet;
}

