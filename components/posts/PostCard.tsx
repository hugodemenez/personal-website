'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SubstackPost } from '@/lib/substack-feed';

interface PostCardProps {
  post: SubstackPost;
  position: number;
  translateX: number;
  translateY: number;
  translateZ: number;
  rotateX?: number;
  scale: number;
  opacity: number;
  zIndex: number;
  shouldBeVisible: boolean;
  isDragging: boolean;
  prefersReducedMotion: boolean;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PostCard({
  post,
  position,
  translateX,
  translateY,
  translateZ,
  rotateX = 0,
  scale,
  opacity,
  zIndex,
  shouldBeVisible,
  isDragging,
  prefersReducedMotion,
}: PostCardProps) {
  return (
    <div
      className="absolute top-1/2 left-1/2 transition-all duration-300"
      style={{
        transform: `
          translate(-50%, -50%)
          translateX(${translateX}px)
          translateY(${translateY}px)
          translateZ(${translateZ}px)
          rotateX(${rotateX}deg)
          scale(${scale})
        `,
        opacity,
        zIndex,
        transformStyle: 'preserve-3d',
        transitionTimingFunction: 'cubic-bezier(.165, .84, .44, 1)', // ease-out-quart
        pointerEvents: shouldBeVisible && position === 0 ? 'auto' : 'none',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        visibility: shouldBeVisible ? 'visible' : 'hidden',
      }}
    >
      <Link
        href={post.slug ? `/posts/${post.slug}` : post.link}
        target={post.slug ? undefined : '_blank'}
        rel={post.slug ? undefined : 'noopener noreferrer'}
        className="block"
      >
        <div
          className="bg-background rounded-2xl overflow-hidden shadow-lg"
          style={{
            width: '600px',
            maxWidth: '85vw',
            boxShadow:
              position === 0
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
                : position === 1
                  ? '0 15px 35px -8px rgba(0, 0, 0, 0.3)'
                  : position === 2
                    ? '0 10px 25px -5px rgba(0, 0, 0, 0.25)'
                    : '0 8px 20px -4px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            className="relative w-full overflow-hidden bg-surface"
            style={{ aspectRatio: '2/1' }}
          >
            {post.image ? (
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 90vw, 700px"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface text-muted/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-12 h-12"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2 md:mb-3 leading-tight">
              {post.title}
            </h2>
            {post.description && (
              <p className="text-sm md:text-base text-muted mb-3 md:mb-4 leading-relaxed line-clamp-2">
                {post.description}
              </p>
            )}
            <p className="text-xs md:text-sm text-muted">
              {formatDate(post.pubDate)}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
