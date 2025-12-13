'use client';

import type { SubstackPost } from '@/lib/substack-feed';
import PostCard from './PostCard';

interface PostStackProps {
  posts: SubstackPost[];
  selectedPostIndex: number;
  onSelectPost: (index: number) => void;
}

export default function PostStack({
  posts,
  selectedPostIndex,
  onSelectPost,
}: PostStackProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ overflow: 'visible' }}>
      <div
        className="relative w-full max-w-3xl"
        style={{
          height: '600px',
          minHeight: '600px',
          paddingTop: '100px',
          perspective: '2000px',
          perspectiveOrigin: '50% 50%',
          transformStyle: 'preserve-3d',
          overflow: 'visible',
        }}
      >
        {posts.map((post, index) => {
          const position = index - selectedPostIndex;
          const maxVisiblePosts = 4;
          // Show posts that are behind (position > 0) up to maxVisiblePosts
          // Also show the selected post (position === 0)
          const shouldBeVisible = position >= 0 && position <= maxVisiblePosts;

          // Stack view: posts behind peek out from top with improved depth
          // More pronounced vertical offset for better stacking visibility on desktop
          const translateY = position === 0 ? 0 : -position * 35;
          // Increased Z-depth for stronger 3D effect
          const translateZ = position === 0 ? 0 : -position * 150;
          // Slight rotation for natural stacking feel (subtle tilt)
          const rotateX = position === 0 ? 0 : position * 1.5;
          // Smoother scale curve - cards get smaller more gradually
          // Less aggressive scaling on desktop to maintain visibility
          const scale = position === 0 ? 1 : Math.max(0.8, 1 - position * 0.05);
          // Better opacity curve - maintain visibility longer
          // Ensure minimum opacity of 0.7 for better visibility
          const opacity = shouldBeVisible
            ? position === 0
              ? 1
              : Math.max(0.7, 1 - position * 0.07)
            : 0;
          // Ensure proper z-index ordering - higher position = lower z-index (behind)
          // Cards further back should have lower z-index to appear behind
          const zIndex = position === 0 ? 1000 : 1000 - position;

          return (
            <PostCard
              key={post.slug}
              post={post}
              position={position}
              translateX={0}
              translateY={translateY}
              translateZ={translateZ}
              rotateX={rotateX}
              scale={scale}
              opacity={opacity}
              zIndex={zIndex}
              shouldBeVisible={shouldBeVisible}
              isDragging={false}
              prefersReducedMotion={false}
            />
          );
        })}
      </div>
    </div>
  );
}
