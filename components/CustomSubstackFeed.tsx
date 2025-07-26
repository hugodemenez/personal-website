import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './CustomSubstackFeed.module.css';
import { formatDistanceToNow } from 'date-fns';

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

interface CustomSubstackFeedProps {
  posts: Post[];
  isLoading?: boolean;
}

export default function CustomSubstackFeed({ posts, isLoading = false }: CustomSubstackFeedProps) {
  const [visibleCount, setVisibleCount] = useState(4);
  const [isGallery, setIsGallery] = useState(false);
  const itemsPerLoad = 4;

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

  return (
    <div className={styles.container}>
      <div className={`${styles.grid} ${isGallery ? styles.gallery : ''}`}>
        {posts?.map((post, idx) => (
          <Link 
            href={post.link} 
            key={post.guid || idx} 
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