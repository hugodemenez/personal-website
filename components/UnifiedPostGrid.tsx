import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import styles from './CustomSubstackFeed.module.css';
import type { UnifiedPost } from '../lib/posts';

interface UnifiedPostGridProps {
  posts: UnifiedPost[];
  showLoadMore?: boolean;
  initialVisible?: number;
}

const TagColors = {
  substack: 'rgba(255, 107, 0, 0.95)',
  code: 'rgba(59, 130, 246, 0.95)',
  tech: 'rgba(16, 185, 129, 0.95)',
  trading: 'rgba(245, 158, 11, 0.95)',
  personal: 'rgba(168, 85, 247, 0.95)',
  default: 'rgba(107, 114, 128, 0.95)',
};

function getTagColor(tag?: string): string {
  if (!tag) return TagColors.default;
  return TagColors[tag.toLowerCase() as keyof typeof TagColors] || TagColors.default;
}

function PostCard({ post, index }: { post: UnifiedPost; index: number }) {
  const isSubstack = post.source === 'substack';
  const tagColor = getTagColor(post.tag);
  
  return (
    <Link 
      href={post.link || `/posts/${post.slug}`}
      className={`${styles.postLink} ${isSubstack ? 'substack-post-transition' : 'post-card-transition'}`}
      target={isSubstack ? '_blank' : '_self'}
      rel={isSubstack ? 'noopener noreferrer' : undefined}
      style={{ 
        animationDelay: `${index * 0.1}s`,
        viewTransitionName: isSubstack ? 'substack-post' : 'post-card'
      }}
    >
      {/* Image or placeholder */}
      {post.image ? (
        <Image 
          src={post.image} 
          alt={post.title} 
          width={400} 
          height={220} 
          className={styles.postImage}
          priority={index < 4}
          loading={index < 4 ? 'eager' : 'lazy'}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        />
      ) : (
        <div 
          className={styles.postImage}
          style={{
            background: `linear-gradient(135deg, ${tagColor}22, ${tagColor}44)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tagColor,
            fontSize: '2rem',
            fontWeight: 'bold',
          }}
        >
          {post.title.charAt(0).toUpperCase()}
        </div>
      )}
      
      {/* Source tag */}
      <div 
        className={styles.substackTag}
        style={{ backgroundColor: tagColor }}
      >
        {post.tag || post.source}
      </div>
      
      {/* Content overlay */}
      <div className={styles.contentOverlay}>
        <div className={styles.postDate}>
          {formatDistanceToNow(new Date(post.date), { addSuffix: true })}
          {post.readingTime && ` • ${post.readingTime} min read`}
        </div>
        
        <h3 className={styles.postTitle}>
          {post.title}
        </h3>
        
        {post.description && (
          <p className={styles.postDescription}>
            {post.description}
          </p>
        )}
        
        {post.author && post.author !== 'Hugo Demenez' && (
          <p 
            className={styles.postDate}
            style={{ 
              marginTop: '8px',
              opacity: 0.8,
              fontSize: '0.75rem'
            }}
          >
            by {post.author}
          </p>
        )}
      </div>
    </Link>
  );
}

function LoadingSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {Array.from({ length: count }, (_, idx) => (
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

export default function UnifiedPostGrid({ 
  posts, 
  showLoadMore = true, 
  initialVisible = 6 
}: UnifiedPostGridProps) {
  const [visibleCount, setVisibleCount] = useState(initialVisible);
  const [isGallery, setIsGallery] = useState(false);
  const itemsPerLoad = 6;

  const handleShowMore = useCallback(() => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setVisibleCount(prev => Math.min(prev + itemsPerLoad, posts.length));
      });
    } else {
      setVisibleCount(prev => Math.min(prev + itemsPerLoad, posts.length));
    }
  }, [itemsPerLoad, posts.length]);

  const handleCollapse = useCallback(() => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setVisibleCount(initialVisible);
        setIsGallery(false);
      });
    } else {
      setVisibleCount(initialVisible);
      setIsGallery(false);
    }
  }, [initialVisible]);

  const handleShowAll = useCallback(() => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setVisibleCount(posts.length);
        setIsGallery(true);
      });
    } else {
      setVisibleCount(posts.length);
      setIsGallery(true);
    }
  }, [posts.length]);

  if (!posts || posts.length === 0) {
    return (
      <div className={styles.errorMessage}>
        <p>No posts available at the moment.</p>
      </div>
    );
  }

  const visiblePosts = posts.slice(0, visibleCount);

  return (
    <div className={styles.container}>
      <div className={`${styles.grid} ${isGallery ? styles.gallery : ''}`}>
        {visiblePosts.map((post, index) => (
          <PostCard 
            key={post.slug || post.guid || index} 
            post={post} 
            index={index}
          />
        ))}
      </div>
      
      {showLoadMore && posts.length > initialVisible && (
        <div className={styles.buttonGroup}>
          {!isGallery && visibleCount < posts.length && (
            <button onClick={handleShowMore} className={styles.showMoreButton}>
              Show More ({Math.min(itemsPerLoad, posts.length - visibleCount)} more)
            </button>
          )}
          
          {visibleCount > initialVisible && (
            <button onClick={handleCollapse} className={styles.showMoreButton}>
              Show Less
            </button>
          )}
          
          {!isGallery && posts.length > initialVisible && (
            <button onClick={handleShowAll} className={styles.showMoreButton}>
              Show All ({posts.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { LoadingSkeleton };