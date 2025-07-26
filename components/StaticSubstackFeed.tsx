import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './CustomSubstackFeed.module.css';
import { formatDistanceToNow } from 'date-fns';
import useSWR from 'swr';

interface Post {
  title: string;
  link: string;
  image?: string;
  pubDate: string;
  description?: string;
  content?: string;
  author?: string;
  guid?: string;
  slug?: string;
}

interface StaticSubstackFeedProps {
  initialPosts: Post[];
  lastUpdated?: string;
  enableLiveUpdates?: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StaticSubstackFeed({ 
  initialPosts, 
  lastUpdated,
  enableLiveUpdates = true 
}: StaticSubstackFeedProps) {
  const [visibleCount, setVisibleCount] = useState(4);
  const [isGallery, setIsGallery] = useState(false);
  const itemsPerLoad = 4;

  // Use SWR for live updates only if enabled and we have initial data
  const { data, error } = useSWR(
    enableLiveUpdates ? '/api/substack-feed' : null,
    fetcher,
    {
      fallbackData: { posts: initialPosts, lastUpdated },
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 300000, // Check for updates every 5 minutes
      dedupingInterval: 300000,
      errorRetryCount: 2,
    }
  );

  // Use either live data or static data
  const posts = data?.posts || initialPosts;
  const isLoading = false; // Since we always have static data

  const handleShowMore = useCallback(() => {
    // Use view transition only if user prefers motion and it's supported
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => {
        setVisibleCount(prev => prev + itemsPerLoad);
      });
    } else {
      setVisibleCount(prev => prev + itemsPerLoad);
    }
  }, [itemsPerLoad]);

  const handleCollapse = useCallback(() => {
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => {
        setVisibleCount(4);
        setIsGallery(false);
      });
    } else {
      setVisibleCount(4);
      setIsGallery(false);
    }
  }, []);

  const handleShowAll = useCallback(() => {
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => {
        setVisibleCount(posts.length);
        setIsGallery(true);
      });
    } else {
      setVisibleCount(posts.length);
      setIsGallery(true);
    }
  }, [posts.length]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.grid}>
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className={styles.skeletonCard}>
              <div className={styles.skeletonImage} />
              <div className={styles.skeletonContent}>
                <div className={styles.skeletonDate} />
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonDesc} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className={styles.errorMessage}>
        <p>No posts available at the moment.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {enableLiveUpdates && lastUpdated && (
        <p className={styles.lastUpdated}>
          Last updated: {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
          {error && (
            <span style={{ color: '#f59e0b', marginLeft: '8px' }}>
              (Live updates unavailable - showing cached content)
            </span>
          )}
        </p>
      )}
      
      <div className={`${styles.grid} ${isGallery ? styles.gallery : ''}`}>
        {posts.map((post, idx) => (
          <Link 
            href={post.link} 
            key={post.guid || post.slug || idx} 
            className={`${styles.postLink} substack-post-transition`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              animationDelay: idx < 8 ? `${idx * 0.05}s` : '0s',
              ...(idx >= visibleCount && { display: 'none' })
            }}
          >
            {post.image && (
              <Image 
                src={post.image} 
                alt={post.title} 
                width={400} 
                height={220} 
                className={styles.postImage}
                priority={idx < 4}
                loading={idx < 4 ? 'eager' : 'lazy'}
                placeholder="blur"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              />
            )}
            
            <div className={styles.substackTag}>
              Substack
            </div>
            
            <div className={styles.contentOverlay}>
              <p className={styles.postDate}>
                {formatDistanceToNow(new Date(post.pubDate), { addSuffix: true })}
              </p>
              <h3 className={styles.postTitle}>
                {post.title}
              </h3>
              {post.description && (
                <p className={styles.postDescription}>
                  {post.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
      
      <div className={styles.buttonGroup}>
        {!isGallery && visibleCount < posts.length && (
          <button onClick={handleShowMore} className={styles.showMoreButton}>
            Show more
          </button>
        )}
        {visibleCount > 4 && (
          <button onClick={handleCollapse} className={styles.showMoreButton}>
            Collapse
          </button>
        )}
        {!isGallery && (
          <button onClick={handleShowAll} className={styles.showMoreButton}>
            Show all
          </button>
        )}
      </div>
    </div>
  );
}