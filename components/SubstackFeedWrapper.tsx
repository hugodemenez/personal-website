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
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        color: '#6b7280',
        background: '#f9fafb',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        margin: '20px 0'
      }}>
        <p>Unable to load recent posts. Please try again later.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '8px', opacity: 0.7 }}>
          You can still visit my{' '}
          <a 
            href="https://substack.com/@hugodemenez"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#f59e0b', textDecoration: 'underline' }}
          >
            Substack directly
          </a>
        </p>
      </div>
    );
  }

  return <CustomSubstackFeed posts={data?.posts || []} isLoading={isLoading} />;
} 