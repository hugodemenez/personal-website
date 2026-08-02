"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type MouseEvent,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { SubstackPost } from "@/types/substack-post";
import { PinnedShell } from "./pinned-shell";

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

// Feed descriptions arrive pre-truncated at ~153 chars, often mid-word
// ("...the most influe..."). Back off to the last whole word.
function formatPostDescription(description: string): string {
  const trimmed = description.trim();
  if (!/(\.{3}|…)$/.test(trimmed)) return trimmed;

  const body = trimmed.replace(/(\.{3}|…)$/, "").trimEnd();
  const lastSpace = body.lastIndexOf(" ");

  return `${lastSpace > 0 ? body.slice(0, lastSpace) : body}…`;
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
      className="mt-8"
    >
      {/* Pinned the same way as the header, not with position:sticky — sticky
          here reproduces the iOS Safari bottom-bar strip every time. */}
      <PinnedShell
        className="relative z-20 -mx-4 flex items-baseline justify-between gap-4 px-4 pb-4 pt-4"
        offset={52}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-background"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-full h-8 bg-linear-to-b from-background to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        <h2
          id="posts-heading"
          className="relative font-serif text-3xl tracking-[-0.035em] text-foreground"
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
        <p className="relative text-sm tabular-nums text-muted/70">
          {String(selectedPostIndex + 1).padStart(2, "0")} /{" "}
          {String(sortedPosts.length).padStart(2, "0")}
        </p>
      </PinnedShell>

      <ol className="relative px-1 pb-24 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-border before:content-[''] sm:px-3 sm:before:left-[1.625rem]">
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
              className="relative grid grid-cols-[1.5rem_1fr] items-start gap-3 sm:grid-cols-[1.75rem_1fr] sm:gap-4"
              data-post-index={postIndex}
            >
              <span
                aria-hidden="true"
                className={`relative z-10 mx-auto mt-7 size-2 rounded-full border transition-[background-color,border-color,transform] duration-150 ease-out motion-reduce:transition-none ${
                  isSelected
                    ? "scale-125 border-accent bg-accent"
                    : "border-border bg-background"
                }`}
              />
              <div className="min-h-20">
                <Link
                  aria-current={isSelected ? "true" : undefined}
                  className={`flex min-h-11 items-center pb-1.5 pt-4 text-[1.05rem] leading-snug tracking-[-0.015em] transition-colors duration-150 motion-reduce:transition-none ${
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

                {post.description ? (
                  <p
                    className={`mb-4 max-w-prose text-[0.9rem] leading-relaxed transition-colors duration-150 motion-reduce:transition-none ${
                      isSelected ? "text-muted/75" : "text-muted/45"
                    }`}
                  >
                    {formatPostDescription(post.description)}
                  </p>
                ) : null}

                {post.image ? (
                  <Link
                    aria-hidden="true"
                    className="mb-8 block overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
                    href={getPostHref(post)}
                    rel={post.slug ? undefined : "noopener noreferrer"}
                    tabIndex={-1}
                    target={post.slug ? undefined : "_blank"}
                  >
                    <Image
                      alt=""
                      className="h-[clamp(9rem,34vw,13rem)] w-full object-cover"
                      height={400}
                      sizes={IMAGE_SIZES}
                      src={post.image}
                      unoptimized
                      width={700}
                    />
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
