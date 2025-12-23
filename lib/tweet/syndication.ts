const SYNDICATION_URL = 'https://cdn.syndication.twimg.com';
const TWEET_ID = /^[0-9]+$/;

export class TwitterApiError extends Error {
  status: number;
  data: unknown;

  constructor({ message, status, data }: { message: string; status: number; data: unknown }) {
    super(message);
    this.name = 'TwitterApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Generates the token required by the Twitter syndication API.
 * This matches the algorithm used by react-tweet.
 */
function getToken(id: string): string {
  return (Number(id) / 1e15 * Math.PI).toString(6 ** 2).replace(/(0+|\.)/g, '');
}

/**
 * Builds the URL for fetching a tweet from the Twitter syndication API.
 */
export function buildTweetUrl(id: string): URL {
  if (id.length > 40 || !TWEET_ID.test(id)) {
    throw new Error(`Invalid tweet id: ${id}`);
  }

  const url = new URL(`${SYNDICATION_URL}/tweet-result`);
  url.searchParams.set('id', id);
  url.searchParams.set('lang', 'en');
  url.searchParams.set('features', [
    'tfw_timeline_list:',
    'tfw_follower_count_sunset:true',
    'tfw_tweet_edit_backend:on',
    'tfw_refsrc_session:on',
    'tfw_fosnr_soft_interventions_enabled:on',
    'tfw_show_birdwatch_pivots_enabled:on',
    'tfw_show_business_verified_badge:on',
    'tfw_duplicate_scribes_to_settings:on',
    'tfw_use_profile_image_shape_enabled:on',
    'tfw_show_blue_verified_badge:on',
    'tfw_legacy_timeline_sunset:true',
    'tfw_show_gov_verified_badge:on',
    'tfw_show_business_affiliate_badge:on',
    'tfw_tweet_edit_frontend:on',
  ].join(';'));
  url.searchParams.set('token', getToken(id));

  return url;
}

/**
 * Fetches a tweet from the Twitter syndication API.
 */
export async function fetchTweet(
  id: string,
  fetchOptions?: RequestInit
): Promise<{ data?: unknown; tombstone?: true; notFound?: true }> {
  const url = buildTweetUrl(id);
  const res = await fetch(url.toString(), fetchOptions);
  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const data = isJson ? await res.json() : undefined;

  if (res.ok) {
    if (data?.__typename === 'TweetTombstone') {
      return { tombstone: true };
    }
    return { data };
  }

  if (res.status === 404) {
    return { notFound: true };
  }

  throw new TwitterApiError({
    message:
      typeof data?.error === 'string'
        ? data.error
        : `Failed to fetch tweet at "${url}" with "${res.status}".`,
    status: res.status,
    data,
  });
}

