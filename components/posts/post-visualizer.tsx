"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type MouseEvent,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { SubstackPost } from "@/types/substack-post";

interface PostsVisualizerProps {
  posts: SubstackPost[];
}

const IMAGE_SIZES = "(max-width: 768px) 92vw, 700px";

interface TimelineMilestone {
  date: string;
  id: string;
  label: string;
  text: string;
}

const TIMELINE_MILESTONES: TimelineMilestone[] = [
  {
    date: "2026-02-01T00:00:00.000Z",
    id: "first-developer-role",
    label: "February 2026",
    text: "Started my first developer role at a large technology company.",
  },
  {
    date: "2025-07-01T00:00:00.000Z",
    id: "became-a-father",
    label: "July 2025",
    text: "Became a father.",
  },
  {
    date: "2024-09-01T00:00:00.000Z",
    id: "founded-deltalytix",
    label: "September 2024",
    text: "Founded Deltalytix, which I still operate today.",
  },
];

type SelectionDirection = "forward" | "backward" | null;

interface SelectionState {
  currentIndex: number;
  previousIndex: number | null;
  direction: SelectionDirection;
  transitionId: number;
}

type SelectionAction =
  | { type: "reset" }
  | { type: "select"; index: number; animate?: boolean };

const initialSelection: SelectionState = {
  currentIndex: 0,
  previousIndex: null,
  direction: null,
  transitionId: 0,
};

function selectionReducer(
  state: SelectionState,
  action: SelectionAction
): SelectionState {
  if (action.type === "reset") return initialSelection;
  if (action.index === state.currentIndex) return state;

  return {
    currentIndex: action.index,
    previousIndex: action.animate === false ? null : state.currentIndex,
    direction:
      action.animate === false
        ? null
        : action.index > state.currentIndex
          ? "forward"
          : "backward",
    transitionId: state.transitionId + 1,
  };
}

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
  const [selection, dispatchSelection] = useReducer(
    selectionReducer,
    initialSelection
  );
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
  const timelineEntries = useMemo(
    () =>
      [
        ...sortedPosts.map((post, postIndex) => ({
          date: post.pubDate,
          kind: "post" as const,
          post,
          postIndex,
        })),
        ...TIMELINE_MILESTONES.map((milestone) => ({
          date: milestone.date,
          kind: "milestone" as const,
          milestone,
        })),
      ].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [sortedPosts]
  );

  useEffect(() => {
    dispatchSelection({ type: "reset" });
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

      dispatchSelection({ type: "select", index: nearestIndex });
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

  const selectedPostIndex = selection.currentIndex;
  const selectedPost = sortedPosts[selectedPostIndex] ?? sortedPosts[0];
  const previousPost =
    selection.previousIndex === null
      ? null
      : sortedPosts[selection.previousIndex];
  const preloadBatchStart =
    selectedPostIndex === 0
      ? 1
      : Math.floor(selectedPostIndex / 3) * 3 + 1;
  const preloadBatch = sortedPosts.slice(
    preloadBatchStart,
    preloadBatchStart + 3
  );
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
      className="relative mx-auto mt-8 w-full max-w-xl px-4 sm:px-0"
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
        {timelineEntries.map((entry) => {
          if (entry.kind === "milestone") {
            const { milestone } = entry;

            return (
              <li
                key={milestone.id}
                className="relative grid min-h-28 grid-cols-[1.5rem_1fr] items-center gap-3 sm:grid-cols-[1.75rem_1fr] sm:gap-4"
                data-timeline-highlight={milestone.id}
              >
                <span
                  aria-hidden="true"
                  className="relative z-10 mx-auto size-3 rounded-full border-2 border-background bg-accent shadow-[0_0_0_1px_var(--accent)]"
                />
                <div className="my-4 rounded-xl border border-accent/20 bg-accent/[0.07] px-4 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-accent">
                      Highlight
                    </span>
                    <time
                      className="text-xs font-medium tabular-nums text-muted/60"
                      dateTime={milestone.date}
                    >
                      {milestone.label}
                    </time>
                  </div>
                  <p className="mt-1.5 font-serif text-lg leading-snug tracking-[-0.015em] text-foreground">
                    {milestone.text}
                  </p>
                </div>
              </li>
            );
          }

          const { post, postIndex } = entry;
          const isSelected = postIndex === selectedPostIndex;

          return (
            <li
              key={`${post.slug}-${postIndex}`}
              ref={(node) => {
                postRefs.current[postIndex] = node;
              }}
              className="relative grid min-h-20 grid-cols-[1.5rem_1fr] items-center gap-3 sm:grid-cols-[1.75rem_1fr] sm:gap-4"
              data-post-index={postIndex}
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
                onFocus={() =>
                  dispatchSelection({
                    type: "select",
                    index: postIndex,
                    animate: false,
                  })
                }
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
        className={`writing-deck fixed z-30 overflow-visible will-change-transform transition-[transform,opacity] duration-[240ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
          isWritingVisible
            ? "[transform:translateX(0)_scale(0.5)] opacity-100"
            : "pointer-events-none [transform:translateX(calc(100%+1rem))_scale(0.5)] opacity-0"
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

        <div className="relative h-full w-full">
          {previousPost ? (
            <Link
              key={`previous-${previousPost.slug}-${selection.transitionId}`}
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 overflow-hidden rounded-xs border border-border bg-surface shadow-lg ${
                selection.direction === "forward"
                  ? "artwork-stack-under z-10"
                  : "artwork-destack-out z-20"
              }`}
              href={getPostHref(previousPost)}
              rel={previousPost.slug ? undefined : "noopener noreferrer"}
              tabIndex={-1}
              target={previousPost.slug ? undefined : "_blank"}
            >
              {previousPost.image ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes={IMAGE_SIZES}
                  src={previousPost.image}
                  unoptimized
                />
              ) : (
                <span className="flex h-full items-center justify-center px-8 text-center font-serif text-2xl text-muted">
                  {previousPost.title}
                </span>
              )}
            </Link>
          ) : null}

          <Link
            key={`deck-${selectedPost.slug}-${selection.transitionId}`}
            className={`absolute inset-0 overflow-hidden rounded-xs border border-border bg-surface shadow-lg ${
              selection.direction === "forward"
                ? "artwork-stack-in z-20"
                : selection.direction === "backward"
                  ? "artwork-destack-reveal z-10"
                  : "z-10"
            }`}
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
