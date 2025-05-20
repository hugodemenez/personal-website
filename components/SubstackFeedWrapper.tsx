import useSWR from 'swr';
import CustomSubstackFeed from './CustomSubstackFeed';

interface Post {
  title: string;
  link: string;
  image?: string;
  pubDate: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SubstackFeedWrapper() {
  const { data, error, isLoading } = useSWR('/api/substack-feed', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 604800000, // Refresh every week (7 days)
  });

  if (error) {
    console.error('Error loading Substack feed:', error);
    return null;
  }

  return <CustomSubstackFeed posts={data?.posts || []} isLoading={isLoading} />;
} 