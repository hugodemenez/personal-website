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
    // We only decide to start swiping once the user has moved
    // far enough in a predominantly horizontal direction.
    setIsSwiping(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // If we haven't committed to a swipe yet, decide based on the initial movement.
    if (!isSwiping) {
      // Let small jitters pass through without doing anything.
      if (absDeltaX < 10 && absDeltaY < 10) {
        return;
      }

      // If the movement is not clearly horizontal (i.e. Y is comparable or larger),
      // treat it as a scroll: don't start a swipe and let the event propagate.
      // The 2x factor makes it require a *very* horizontal gesture to trigger a swipe.
      if (absDeltaX <= absDeltaY * 2) {
        touchStartRef.current = null;
        return;
      }

      // Movement is clearly horizontal: start swiping.
      setIsSwiping(true);
    }

    // We are in swipe mode: capture the gesture and prevent vertical scroll.
    e.preventDefault();
    setSwipeOffset(deltaX);
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !isSwiping) {
      touchStartRef.current = null;
      setSwipeOffset(0);
      setIsSwiping(false);
      return;
    }

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
  }, [swipeOffset, selectedPostIndex, posts.length, onSelectPost, isSwiping]);

  // Reset swipe state when selected post changes
  useEffect(() => {
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
  }, [selectedPostIndex]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center relative"
    >
      {(() => {
        const prevIndex =
          (selectedPostIndex - 1 + posts.length) % posts.length;
        const nextIndex = (selectedPostIndex + 1) % posts.length;

        return posts.map((post, index) => {
          const isSelected = index === selectedPostIndex;
          const isPrev = index === prevIndex;
          const isNext = index === nextIndex;

          // Only render current, previous, and next cards for the stack effect
          if (!isSelected && !isPrev && !isNext) {
            return null;
          }

          const baseScale = 1;

          const swipeProgress = Math.min(
            Math.abs(swipeOffset) / SWIPE_THRESHOLD,
            1
          );

          // Active card moves with the finger and fades slightly
          const translateX = isSelected ? swipeOffset : 0;
          const activeOpacity =
            isSelected && swipeOffset !== 0 ? 1 - swipeProgress * 0.3 : 1;

          // Determine which neighbor should be visible based on swipe direction
          const showingPrev = swipeOffset > 0 && isPrev;
          const showingNext = swipeOffset < 0 && isNext;

          // Underlying card appears as you swipe in its direction
          const neighborOpacity =
            showingPrev || showingNext ? 0.4 + swipeProgress * 0.6 : 0;

          const opacity = isSelected ? activeOpacity : neighborOpacity;
          const zIndex = isSelected ? 30 : 20;

          return (
            <article
              key={post.slug}
              className="absolute inset-0 w-full touch-pan-y"
              style={{
                transform: `translateX(${translateX}px) scale(${baseScale})`,
                opacity,
                zIndex,
                transition: isSwiping
                  ? "none"
                  : "transform 200ms ease-out, opacity 200ms ease-out",
                willChange: isSwiping ? "transform" : "auto",
              }}
              onTouchStart={isSelected ? handleTouchStart : undefined}
              onTouchMove={isSelected ? handleTouchMove : undefined}
              onTouchEnd={isSelected ? handleTouchEnd : undefined}
            >
              <PostCard post={post} />
            </article>
          );
        });
      })()}
    </div>
  );
}
