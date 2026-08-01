"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SubstackPost } from "@/types/substack-post";

interface PostsVisualizerProps {
  posts: SubstackPost[];
}

const IMAGE_SIZES = "(max-width: 768px) 92vw, 700px";

function getPostHref(post: SubstackPost): string {
  return post.slug ? `/posts/${post.slug}` : post.link;
}

function formatPostDate(pubDate: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(pubDate));
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
  const isFirstArtwork = selectedPostIndex === 0;

  const returnToWritingStart = (event: MouseEvent<HTMLButtonElement>) => {
    const shouldReduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    sectionRef.current?.scrollIntoView({
      behavior: shouldReduceMotion || event.detail === 0 ? "auto" : "smooth",
      block: "start",
    });
  };

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
          <button
            aria-label="Return to the beginning of Writing"
            className="-mx-2 min-h-11 cursor-pointer px-2 text-left transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none"
            onClick={returnToWritingStart}
            type="button"
          >
            Writing
          </button>
        </h2>
        <p className="text-sm tabular-nums text-muted/70">
          {String(selectedPostIndex + 1).padStart(2, "0")} /{" "}
          {String(sortedPosts.length).padStart(2, "0")}
        </p>
      </div>

      <ol className="relative px-1 pb-[calc(14rem+25vh)] before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-border before:content-[''] sm:px-3 sm:before:left-[1.625rem]">
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
                <span>
                  {post.title}
                  <span
                    className={`ml-2 whitespace-nowrap text-sm font-normal tracking-normal ${
                      isSelected ? "text-muted/70" : "text-muted/45"
                    }`}
                  >
                    • {formatPostDate(post.pubDate)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <div
        data-writing-deck
        className={`fixed inset-x-4 bottom-[env(safe-area-inset-bottom)] z-30 mx-auto h-[clamp(10rem,38vw,14rem)] max-w-xl overflow-hidden motion-reduce:transition-none ${
          isFirstArtwork
            ? "will-change-transform transition-[transform,opacity] duration-[240ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
            : "transition-none"
        } ${
          isWritingVisible
            ? "[transform:translateY(0)] opacity-100"
            : isFirstArtwork
              ? "pointer-events-none [transform:translateY(100%)] opacity-0"
              : "pointer-events-none [transform:translateY(0)] opacity-0"
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
          <Link
            key={`deck-${selectedPost.slug}`}
            className="absolute inset-0 overflow-hidden rounded-t-2xl border border-border bg-surface shadow-lg"
            href={getPostHref(selectedPost)}
            rel={selectedPost.slug ? undefined : "noopener noreferrer"}
            target={selectedPost.slug ? undefined : "_blank"}
          >
            {selectedPost.image ? (
              <Image
                alt={selectedPost.title}
                className="object-cover"
                fill
                loading="eager"
                sizes={IMAGE_SIZES}
                src={selectedPost.image}
                unoptimized
              />
            ) : (
              <span className="flex h-full items-center justify-center px-8 text-center font-serif text-2xl text-muted">
                {selectedPost.title}
              </span>
            )}
          </Link>
        </div>
      </div>
    </section>
  );
}
