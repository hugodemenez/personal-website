import { getPosts } from '@/lib/posts';
import { SearchClient } from './search-client';
import { fetchSubstackPosts } from '@/server/substack-feed';
import { PostMetadata } from '@/lib/posts';

export async function Search() {
  const posts = await getPosts();
  const externalPosts = await fetchSubstackPosts();

  const parsedExternalPosts: PostMetadata[] = externalPosts.map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.pubDate,
    description: post.description,
    tags: ['substack'],
    author: 'Hugo Demenez',
    available: post.available,
  })) as PostMetadata[];

  const allPosts = [...posts, ...parsedExternalPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return <SearchClient posts={allPosts} />;
}
