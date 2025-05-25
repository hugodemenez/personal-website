import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './CustomSubstackFeed.module.css';
import { formatDistanceToNow } from 'date-fns';

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
  const [visibleCount, setVisibleCount] = useState(4);
  const [isGallery, setIsGallery] = useState(false);
  const itemsPerLoad = 4;

  const handleShowMore = () => {
    setVisibleCount(prev => prev + itemsPerLoad);
  };

  const handleCollapse = () => {
    setVisibleCount(4);
    setIsGallery(false);
  };

  const handleShowAll = () => {
    setVisibleCount(posts.length);
    setIsGallery(true);
  };

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {[1, 2, 3, 4].map((idx) => (
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
    <div className={styles.container}>
      <div className={`${styles.grid} ${isGallery ? styles.gallery : ''}`}>
        {posts?.map((post, idx) => (
          <Link 
            href={post.link} 
            key={idx} 
            className={styles.postLink}
            style={{ 
              animationDelay: `${idx * 0.1}s`,
              display: idx < visibleCount ? 'block' : 'none'
            }}
          >
            {post.image && (
              <Image src={post.image} alt={post.title} width={400} height={200} style={{margin:0, height: '20vh', width: '100%', objectFit: 'cover' }} />
            )}
            <div 
              style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                width: '100%', 
                height: '30%', 
                backgroundColor:'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(25px)',
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
              }} 
              id='banner'
            >
              <p style={{ color: '#fff', fontSize: '0.8em', margin: '0' }}>
                {formatDistanceToNow(new Date(post.pubDate), { addSuffix: true })}
              </p>
              <p style={{ color: '#fff', margin: 0, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {post.title}
              </p>
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