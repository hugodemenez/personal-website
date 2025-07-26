import useSWR from 'swr';
import UnifiedPostGrid from './UnifiedPostGrid';
import type { UnifiedPost } from '../lib/posts';

interface UnifiedPostsResponse {
  posts: UnifiedPost[];
  lastUpdated: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UnifiedPostGridWrapperProps {
  showLoadMore?: boolean;
  initialVisible?: number;
}

export default function UnifiedPostGridWrapper({ 
  showLoadMore = true, 
  initialVisible = 6 
}: UnifiedPostGridWrapperProps) {
  const { data, error, isLoading } = useSWR('/api/unified-posts', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 3600000, // Refresh every hour
    dedupingInterval: 300000, // Dedupe requests for 5 minutes
    errorRetryCount: 3,
    onError: (err) => {
      console.error('Error loading unified posts:', err);
    },
  });

  if (error) {
    console.error('Error loading unified posts:', error);
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
          You can visit my{' '}
          <a 
            href="https://substack.com/@hugodemenez"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#f59e0b', textDecoration: 'underline' }}
          >
            Substack
          </a>{' '}
          or check out the{' '}
          <a 
            href="/posts/all"
            style={{ color: '#f59e0b', textDecoration: 'underline' }}
          >
            posts page
          </a>{' '}
          directly.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '20px',
          width: '100%',
          maxWidth: '1200px'
        }}>
          {Array.from({ length: initialVisible }, (_, idx) => (
            <div key={idx} style={{
              height: '380px',
              borderRadius: '16px',
              background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite'
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.posts) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        color: '#6b7280'
      }}>
        <p>No posts found.</p>
      </div>
    );
  }

  return (
    <UnifiedPostGrid 
      posts={data.posts} 
      showLoadMore={showLoadMore}
      initialVisible={initialVisible}
    />
  );
}