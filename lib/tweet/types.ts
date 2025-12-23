/**
 * Minimal type definitions for tweet data from Twitter syndication API.
 * Based on react-tweet's types but simplified for our minimal implementation.
 */

export interface TweetUser {
  id_str: string;
  name: string;
  profile_image_url_https: string;
  profile_image_shape: 'Circle' | 'Square';
  screen_name: string;
  verified: boolean;
  verified_type?: 'Business' | 'Government';
  is_blue_verified: boolean;
}

export interface MediaPhoto {
  type: 'photo';
  media_url_https: string;
  ext_alt_text?: string;
  original_info?: {
    width: number;
    height: number;
  };
}

export type Indices = [number, number];

export interface UrlEntity {
  display_url: string;
  expanded_url: string;
  indices: Indices;
  url: string;
}

export interface UserMentionEntity {
  id_str: string;
  indices: Indices;
  name: string;
  screen_name: string;
}

export interface HashtagEntity {
  indices: Indices;
  text: string;
}

export interface MediaEntity {
  display_url: string;
  expanded_url: string;
  indices: Indices;
  url: string;
  media_url_https?: string;
}

export interface TweetEntities {
  hashtags?: HashtagEntity[];
  urls?: UrlEntity[];
  user_mentions?: UserMentionEntity[];
  symbols?: unknown[];
  media?: MediaEntity[];
}

export interface TwitterCard {
  name: string;
  url: string;
  binding_values?: {
    card_url?: { string_value?: string; type?: string };
    vanity_url?: { string_value?: string; type?: string };
    title?: { string_value?: string; type?: string };
    description?: { string_value?: string; type?: string };
    domain?: { string_value?: string; type?: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Tweet {
  __typename: 'Tweet';
  id_str: string;
  text: string;
  created_at: string;
  lang: string;
  user: TweetUser;
  entities: TweetEntities;
  display_text_range?: Indices;
  mediaDetails?: MediaPhoto[];
  card?: TwitterCard;
  favorite_count: number;
  conversation_count: number;
}

