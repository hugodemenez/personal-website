import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './CustomSubstackFeed.module.css';

interface Post {
  title: string;
  link: string;
  image?: string;
  pubDate: string;
}

interface CustomSubstackFeedProps {
  posts: Post[];
  isLoading?: boolean;
}

export default function CustomSubstackFeed({ posts, isLoading = false }: CustomSubstackFeedProps) {
  if (isLoading) {
    return (
      <div className={styles.grid}>
        {[1, 2, 3].map((idx) => (
          <div key={idx} className={styles.skeletonCard}>
            <div className={styles.skeletonImage} />
            <div className={styles.skeletonDate} />
            <div className={styles.skeletonTitle} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {posts?.map((post, idx) => (
        <Link href={post.link} key={idx} style={{ height: 400, alignItems: 'center', textAlign: 'center' }}>
          {post.image && (
            <Image src={post.image} alt={post.title} width={400} height={200} style={{ width: '100%', maxWidth: 400, borderRadius: 8 }} />
          )}
          <p style={{ color: '#666', fontSize: '0.9em', marginTop: '8px' }}>
            {new Date(post.pubDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p>
            {post.title}
          </p>
        </Link>
      ))}
    </div>
  );
} 