"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SubstackPost } from "@/types/substack-post";

interface PostsVisualizerProps {
  posts: SubstackPost[];
}

const IMAGE_SIZES = "(max-width: 768px) 92vw, 700px";

function getPostHref(post: SubstackPost): string {
  return post.slug ? `/posts/${post.slug}` : post.link;
}

export default function PostsVisualizer({ posts }: PostsVisualizerProps) {
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [isWritingVisible, setIsWritingVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const postRefs = useRef<Array<HTMLLIElement | null>>([]);

  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      ),
    [posts]
  );

  useEffect(() => {
    setSelectedPostIndex(0);
  }, [posts]);

  useEffect(() => {
    let animationFrame = 0;

    const selectNearestPost = () => {
      animationFrame = 0;
      const section = sectionRef.current;
      const sectionBounds = section?.getBoundingClientRect();
      const readingLine = window.innerHeight * 0.45;
      const sectionIsVisible = Boolean(
        sectionBounds &&
          sectionBounds.top <= readingLine &&
          sectionBounds.bottom > readingLine
      );

      setIsWritingVisible((current) =>
        current === sectionIsVisible ? current : sectionIsVisible
      );

      const anchor = window.innerHeight * 0.36;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      postRefs.current.forEach((post, index) => {
        if (!post) return;
        const bounds = post.getBoundingClientRect();
        const distance = Math.abs(bounds.top + bounds.height / 2 - anchor);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      setSelectedPostIndex((current) =>
        current === nearestIndex ? current : nearestIndex
      );
    };

    const scheduleSelection = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(selectNearestPost);
    };

    selectNearestPost();
    window.addEventListener("scroll", scheduleSelection, { passive: true });
    window.addEventListener("resize", scheduleSelection);

    return () => {
      window.removeEventListener("scroll", scheduleSelection);
      window.removeEventListener("resize", scheduleSelection);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [sortedPosts]);

  if (!sortedPosts.length) return null;

  const selectedPost = sortedPosts[selectedPostIndex] ?? sortedPosts[0];
  const preloadBatchStart =
    selectedPostIndex === 0
      ? 1
      : Math.floor(selectedPostIndex / 3) * 3 + 1;
  const preloadBatch = sortedPosts.slice(
    preloadBatchStart,
    preloadBatchStart + 3
  );
  const deckPosts = sortedPosts
    .map((post, index) => ({ post, index }))
    .slice(
      Math.max(0, selectedPostIndex - 1),
      Math.min(sortedPosts.length, selectedPostIndex + 3)
    );

  return (
    <section
      ref={sectionRef}
      aria-labelledby="posts-heading"
      className="relative w-full"
    >
      <div className="sticky top-0 z-20 -mx-2 flex items-baseline justify-between gap-4 bg-background/90 px-2 py-4 backdrop-blur-sm">
        <h2
          id="posts-heading"
          className="font-serif text-3xl tracking-[-0.035em] text-foreground"
        >
          Writing
        </h2>
        <p className="text-sm tabular-nums text-muted/70">
          {String(selectedPostIndex + 1).padStart(2, "0")} /{" "}
          {String(sortedPosts.length).padStart(2, "0")}
        </p>
      </div>

      <ol className="relative px-1 pb-[calc(14rem+25vh)] before:absolute before:bottom-0 before:left-[0.72rem] before:top-0 before:w-px before:bg-border before:content-[''] sm:px-3 sm:before:left-[1.22rem]">
        {sortedPosts.map((post, index) => {
          const isSelected = index === selectedPostIndex;

          return (
            <li
              key={`${post.slug}-${index}`}
              ref={(node) => {
                postRefs.current[index] = node;
              }}
              className="relative grid min-h-20 grid-cols-[1.5rem_1fr] items-center gap-3 sm:grid-cols-[1.75rem_1fr] sm:gap-4"
              data-post-index={index}
            >
              <span
                aria-hidden="true"
                className={`relative z-10 mx-auto size-2 rounded-full border transition-[background-color,border-color,transform] duration-150 ease-out motion-reduce:transition-none ${
                  isSelected
                    ? "scale-125 border-accent bg-accent"
                    : "border-border bg-background"
                }`}
              />
              <Link
                aria-current={isSelected ? "true" : undefined}
                className={`flex min-h-11 items-center py-4 text-[1.05rem] leading-snug tracking-[-0.015em] transition-colors duration-150 motion-reduce:transition-none ${
                  isSelected
                    ? "font-bold text-foreground"
                    : "font-normal text-muted/65 hover:text-foreground"
                }`}
                href={getPostHref(post)}
                onFocus={() => setSelectedPostIndex(index)}
                rel={post.slug ? undefined : "noopener noreferrer"}
                target={post.slug ? undefined : "_blank"}
              >
                {post.title}
              </Link>
            </li>
          );
        })}
      </ol>

      <div
        data-writing-deck
        className={`fixed inset-x-4 bottom-[env(safe-area-inset-bottom)] z-30 mx-auto h-[clamp(10rem,38vw,14rem)] max-w-xl overflow-hidden will-change-transform transition-[transform,opacity] duration-[240ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
          isWritingVisible
            ? "[transform:translateY(0)] opacity-100"
            : "pointer-events-none [transform:translateY(100%)] opacity-0"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-0">
          {preloadBatch.map((post) =>
            post.image ? (
              <Image
                key={`preload-${post.slug}`}
                alt=""
                className="object-cover"
                data-preloaded-post={post.slug}
                fill
                loading="eager"
                sizes={IMAGE_SIZES}
                src={post.image}
                unoptimized
              />
            ) : null
          )}
        </div>

        <div className="relative h-[150%] w-full">
          {deckPosts.map(({ post, index }) => {
            const offset = index - selectedPostIndex;
            const isSelected = offset === 0;
            const translateY = offset < 0 ? "-12%" : `${offset * 100}%`;
            const scale = offset < 0 ? 1.015 : 1 - offset * 0.025;
            const opacity = offset < 0 ? 0 : 1 - offset * 0.14;

            return (
              <Link
                key={`deck-${post.slug}`}
                aria-hidden={isSelected ? undefined : true}
                className={`absolute inset-0 overflow-hidden rounded-t-2xl border border-border bg-surface shadow-lg will-change-transform transition-[transform,opacity] duration-[240ms] [transition-timing-function:cubic-bezier(0.77,0,0.175,1)] motion-reduce:transition-none ${
                  isSelected
                    ? "pointer-events-auto"
                    : "pointer-events-none"
                }`}
                href={getPostHref(post)}
                rel={post.slug ? undefined : "noopener noreferrer"}
                style={{
                  opacity,
                  transform: `translateY(${translateY}) scale(${scale})`,
                  transformOrigin: "center top",
                  zIndex: 40 - offset,
                }}
                tabIndex={isSelected ? undefined : -1}
                target={post.slug ? undefined : "_blank"}
              >
                {post.image ? (
                  <Image
                    alt={post.title}
                    className="object-cover"
                    fill
                    loading={isSelected ? "eager" : "lazy"}
                    sizes={IMAGE_SIZES}
                    src={post.image}
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full items-center justify-center px-8 text-center font-serif text-2xl text-muted">
                    {post.title}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
