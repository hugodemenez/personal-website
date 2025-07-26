import useSWR from 'swr';
import CustomSubstackFeed from './CustomSubstackFeed';

interface Post {
  title: string;
  link: string;
  image?: string;
  pubDate: string;
  description?: string;
  content?: string;
  author?: string;
  guid?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SubstackFeedWrapper() {
  const { data, error, isLoading } = useSWR('/api/substack-feed', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 3600000, // Refresh every hour (3600000 ms)
    dedupingInterval: 300000, // Dedupe requests for 5 minutes
    errorRetryCount: 3,
    onError: (err) => {
      console.error('Error loading Substack feed:', err);
    },
  });

  if (error) {
    console.error('Error loading Substack feed:', error);
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Unable to load recent posts. Please try again later.</p>
      </div>
    );
  }

  return <CustomSubstackFeed posts={data?.posts || []} isLoading={isLoading} />;
} 