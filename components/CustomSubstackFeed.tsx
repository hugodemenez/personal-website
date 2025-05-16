import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './CustomSubstackFeed.module.css';

interface Post {
  title: string;
  link: string;
  image?: string;
  pubDate: string;
}

export default function CustomSubstackFeed() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    async function fetchFeed() {
      const res = await fetch('/api/substack-feed');
      const data = await res.json();
      setPosts(data.posts);
    }
    setInterval(()=>fetchFeed(),10000)
  }, []);

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