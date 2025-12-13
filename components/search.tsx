import { getPosts } from '@/lib/posts';
import { SearchClient } from './search-client';
import { fetchSubstackPosts } from '@/lib/substack-feed';
import { cacheLife } from 'next/cache';
import { PostMetadata } from '@/lib/posts';

export async function Search() {
  'use cache';
  cacheLife('days');
  // Local posts
  const posts = await getPosts();

  // External posts
  const externalPosts = await fetchSubstackPosts();

  // Parse external posts to PostMetadata
  const parsedExternalPosts: PostMetadata[] = externalPosts.map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.pubDate,
    description: post.description,
    tags: [],
    author: 'Hugo Demenez',
  })) as PostMetadata[];

  const allPosts = [...posts, ...parsedExternalPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return <SearchClient posts={allPosts} />;
}

