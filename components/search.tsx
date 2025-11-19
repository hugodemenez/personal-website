import { getPosts } from '@/lib/posts';
import { SearchClient } from './search-client';

export async function Search() {
  const posts = await getPosts();
  
  return <SearchClient posts={posts} />;
}
