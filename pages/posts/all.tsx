import React from 'react';
import UnifiedPostGrid from '../../components/UnifiedPostGrid';
import { getUnifiedPostsStaticProps } from '../../lib/posts';
import type { UnifiedPost } from '../../lib/posts';

interface AllPostsPageProps {
  posts: UnifiedPost[];
  lastUpdated: string;
}

export default function AllPostsPage({ posts, lastUpdated }: AllPostsPageProps) {
  return (
    <article className="prose prose-gray max-w-none">
      <div className="space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold mb-4">All Posts</h1>
          <p className="text-lg text-gray-600 mb-8">
            A collection of my thoughts, tutorials, and insights on programming, trading, and life.
            Posts are sourced from both this blog and my{' '}
            <a 
              href="https://substack.com/@hugodemenez"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-800 transition-colors"
            >
              Substack newsletter
            </a>
            .
          </p>
        </header>

        <UnifiedPostGrid 
          posts={posts}
          showLoadMore={true}
          initialVisible={12}
        />
        
        {posts.length > 0 && (
          <footer className="text-center text-sm text-gray-500 mt-12">
            <p>
              Showing {posts.length} posts • Last updated{' '}
              {new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(lastUpdated))}
            </p>
          </footer>
        )}
      </div>
    </article>
  );
}

// Static generation with revalidation
export const getStaticProps = getUnifiedPostsStaticProps;