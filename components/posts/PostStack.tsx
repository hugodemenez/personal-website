"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import type { SubstackPost } from "@/lib/substack-feed";
import PostCard from "./PostCard";

interface PostStackProps {
  posts: SubstackPost[];
  selectedPostIndex: number;
  onSelectPost: (index: number) => void;
}

const SWIPE_THRESHOLD = 100; // Minimum distance in pixels to trigger swipe

export default function PostStack({
  posts,
  selectedPostIndex,
  onSelectPost,
}: PostStackProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !isSwiping) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    // Only allow horizontal swipes (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault(); // Prevent scrolling
      setSwipeOffset(deltaX);
    }
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return;
    
    const shouldSwipe = Math.abs(swipeOffset) > SWIPE_THRESHOLD;
    
    if (shouldSwipe) {
      // Determine direction: negative deltaX = swipe left (next), positive = swipe right (previous)
      const swipeLeft = swipeOffset < 0;
      
      // Animate card off screen
      setSwipeOffset(swipeLeft ? -window.innerWidth : window.innerWidth);
      
      // After animation starts, navigate to next/previous
      setTimeout(() => {
        if (swipeLeft) {
          // Swipe left → next post
          const nextIndex = selectedPostIndex < posts.length - 1 
            ? selectedPostIndex + 1 
            : 0; // Wrap to first
          onSelectPost(nextIndex);
        } else {
          // Swipe right → previous post
          const prevIndex = selectedPostIndex > 0 
            ? selectedPostIndex - 1 
            : posts.length - 1; // Wrap to last
          onSelectPost(prevIndex);
        }
        
        // Reset after navigation
        setSwipeOffset(0);
        setIsSwiping(false);
        touchStartRef.current = null;
      }, 100); // Start navigation before animation completes
    } else {
      // Snap back to original position
      setSwipeOffset(0);
      setIsSwiping(false);
      touchStartRef.current = null;
    }
  }, [swipeOffset, selectedPostIndex, posts.length, onSelectPost]);

  // Reset swipe state when selected post changes
  useEffect(() => {
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
  }, [selectedPostIndex]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center"
    >
      {posts.map((post, index) => {
        const isSelected = index === selectedPostIndex;
        const opacity = isSelected ? 1 : 0;
        const scale = isSelected ? 1 : 0.95;
        
        // Calculate rotation and opacity based on swipe distance
        const swipeProgress = Math.abs(swipeOffset) / SWIPE_THRESHOLD;
        const rotation = isSelected && swipeOffset !== 0 
          ? (swipeOffset / 20) * Math.min(swipeProgress, 1) 
          : 0;
        const swipeOpacity = isSelected && swipeOffset !== 0
          ? 1 - Math.min(swipeProgress * 0.3, 0.3)
          : 1;
        
        return (
          <article
            key={post.slug}
            className={`${
              isSelected ? "" : "hidden"
            } block w-full touch-none`}
            style={{
              transform: isSelected 
                ? `translateX(${swipeOffset}px) rotate(${rotation}deg) scale(${scale})`
                : undefined,
              opacity: isSelected ? opacity * swipeOpacity : 0,
              transition: isSwiping 
                ? 'none' 
                : 'transform 200ms ease-out, opacity 200ms ease-out',
              willChange: isSwiping ? 'transform' : 'auto',
            }}
            onTouchStart={isSelected ? handleTouchStart : undefined}
            onTouchMove={isSelected ? handleTouchMove : undefined}
            onTouchEnd={isSelected ? handleTouchEnd : undefined}
          >
            <PostCard post={post} />
          </article>
        );
      })}
    </div>
  );
}
