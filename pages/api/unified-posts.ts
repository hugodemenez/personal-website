import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllPosts } from '../../lib/posts';
import type { UnifiedPost } from '../../lib/posts';

interface UnifiedPostsResponse {
  posts: UnifiedPost[];
  lastUpdated: string;
}

interface ErrorResponse {
  error: string;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UnifiedPostsResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', message: 'Only GET requests are supported' });
  }

  try {
    // Set cache headers to improve performance
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    
    const posts = await getAllPosts(true); // Include Substack posts
    
    const response: UnifiedPostsResponse = {
      posts,
      lastUpdated: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching unified posts:', error);
    
    // Try to return MDX posts only if Substack fails
    try {
      const mdxOnlyPosts = await getAllPosts(false); // Exclude Substack posts
      
      const fallbackResponse: UnifiedPostsResponse = {
        posts: mdxOnlyPosts,
        lastUpdated: new Date().toISOString(),
      };

      return res.status(200).json(fallbackResponse);
    } catch (fallbackError) {
      console.error('Error fetching MDX posts as fallback:', fallbackError);
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch posts'
      });
    }
  }
}