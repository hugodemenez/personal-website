'use client';

import { useRef, useCallback } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const rafRef = useRef<number>(0);

  const updateDragTransform = useCallback(() => {
    if (!containerRef.current || !isDraggingRef.current) return;
    
    const dragX = currentX.current;
    const dragRotate = dragX * 0.05;
    
    // Use CSS custom properties for GPU-accelerated transforms
    containerRef.current.style.setProperty('--drag-x', `${dragX}px`);
    containerRef.current.style.setProperty('--drag-rotate', `${dragRotate}deg`);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle on mobile (viewport width < 768px)
    if (window.innerWidth >= 768) return;

    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    currentX.current = 0;
    isDraggingRef.current = false;

    if (containerRef.current) {
      containerRef.current.classList.add('is-dragging');
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (window.innerWidth >= 768) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Check if horizontal swipe is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
      }
      e.preventDefault(); // Prevent scrolling

      currentX.current = deltaX;
      
      // Use RAF for smooth 60fps updates
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(updateDragTransform);
    }
  }, [updateDragTransform]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (window.innerWidth >= 768) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    // Remove dragging class and reset CSS properties
    if (containerRef.current) {
      containerRef.current.classList.remove('is-dragging');
      containerRef.current.style.removeProperty('--drag-x');
      containerRef.current.style.removeProperty('--drag-rotate');
    }

    // Check if it's a swipe (horizontal movement > threshold and dominant)
    const threshold = 80;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold && isDraggingRef.current) {
      // Any swipe left or right moves to next card (puts current to back)
      const nextIndex = (selectedPostIndex + 1) % posts.length;
      onSelectPost(nextIndex);
    }

    isDraggingRef.current = false;
    currentX.current = 0;
  }, [selectedPostIndex, posts.length, onSelectPost]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ overflow: 'visible' }}>
      <div
        ref={containerRef}
        className="relative w-full max-w-3xl post-stack-container"
        style={{
          height: '600px',
          minHeight: '600px',
          paddingTop: '100px',
          perspective: '2000px',
          perspectiveOrigin: '50% 50%',
          transformStyle: 'preserve-3d',
          overflow: 'visible',
          '--drag-x': '0px',
          '--drag-rotate': '0deg',
        } as React.CSSProperties}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {posts.map((post, index) => {
          const position = index - selectedPostIndex;
          const maxVisiblePosts = 4;
          const shouldBeVisible = position >= 0 && position <= maxVisiblePosts;

          const translateY = position === 0 ? 0 : -position * 35;
          const translateZ = position === 0 ? 0 : -position * 150;
          const rotateX = position === 0 ? 0 : position * 1.5;
          const scale = position === 0 ? 1 : Math.max(0.8, 1 - position * 0.05);
          const opacity = shouldBeVisible
            ? position === 0
              ? 1
              : Math.max(0.7, 1 - position * 0.07)
            : 0;
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
