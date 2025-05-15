import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
    fetchFeed();
  }, []);

  return (
    <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'center' }}>
      {posts.map((post, idx) => (
        <div key={idx} style={{ height: 400, alignItems: 'center', textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: '0.9em', marginTop: '8px' }}>
            {new Date(post.pubDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          {post.image && (
            <Image src={post.image} alt={post.title} width={400} height={200} style={{ width: '100%', maxWidth: 400, borderRadius: 8 }} />
          )}
          <p>
            <Link href={post.link} target="_blank" rel="noopener noreferrer">
              {post.title}
            </Link>
          </p>
        </div>
      ))}
    </div>
  );
} 