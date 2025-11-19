import { fetchSubstackPosts } from '@/lib/substack-feed';

export async function GET() {
  try {
    const posts = await fetchSubstackPosts();
    return Response.json({ posts });
  } catch (error) {
    console.error('Error fetching Substack feed:', error);
    return Response.json(
      { error: 'Failed to fetch Substack feed' },
      { status: 500 }
    );
  }
}

