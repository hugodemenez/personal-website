import type { NextApiRequest, NextApiResponse } from 'next';
import { XMLParser } from 'fast-xml-parser';

const SUBSTACK_FEED_URL = 'https://hugodemenez.substack.com/feed';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const feedRes = await fetch(SUBSTACK_FEED_URL);
    const xml = await feedRes.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const json = parser.parse(xml);
    const items = json.rss.channel.item;
    const posts = items.map((item: any) => {
      // Try to extract image from content:encoded or enclosure
      let image = undefined;
      if (item['media:content'] && item['media:content']['@_url']) {
        image = item['media:content']['@_url'];
      } else if (item.enclosure && item.enclosure['@_url']) {
        image = item.enclosure['@_url'];
      } else if (item['content:encoded']) {
        const match = item['content:encoded'].match(/<img[^>]+src=["']([^"'>]+)["']/);
        if (match) image = match[1];
      }
      return {
        title: item.title,
        link: item.link,
        image,
        pubDate: item.pubDate,
      };
    });
    res.status(200).json({ posts });
  } catch (error) {
    console.error('Error fetching Substack feed:', error);
    res.status(500).json({ error: 'Failed to fetch Substack feed' });
  }
} 