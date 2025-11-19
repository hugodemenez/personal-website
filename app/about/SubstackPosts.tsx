import { fetchSubstackPosts } from '@/lib/substack-feed';
import SubstackCarousel from './SubstackCarousel';
import { cacheLife } from 'next/cache';

export default async function SubstackPosts() {
  'use cache';
  cacheLife('weeks');
  try {
    const posts = await fetchSubstackPosts();
    if (!posts.length) {
      return <p className="text-muted">No posts available right now.</p>;
    }

    return <SubstackCarousel posts={posts} />;
  } catch (error) {
    console.error('Failed to load Substack posts in about page:', error);
    return (
      <p className="text-muted">
        Unable to load posts right now. Please try again later.
      </p>
    );
  }
}
