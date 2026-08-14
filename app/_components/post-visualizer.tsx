"use client";

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
import { layoutStampAlbum } from "@/lib/stamp-album";
import HighlighterText from "./highlighter-text";
import { PinnedShell } from "./pinned-shell";
import { PostStamp } from "./post-stamp";
import { StampAlbum } from "./stamp-album";

interface PostsVisualizerProps {
  posts: SubstackPost[];
}

const IMAGE_SIZES = "(max-width: 768px) 92vw, 700px";

/** How many titles back still count as "just passed" for the exit animation. */
const TITLE_HISTORY = 4;

/** Where a title comes to rest — just under the Writing bar, not behind it. */
const TITLE_OFFSET = 104;

interface TimelineMilestone {
  date: string;
  id: string;
  label: string;
  text: string;
}

const TIMELINE_MILESTONES: TimelineMilestone[] = [
  {
    date: "2026-02-01T00:00:00.000Z",
    id: "joined-foundever",
    label: "February 2026",
    text: "Joined Foundever after three years of building on my own, still learning while building an AI gateway and other tools for developers.",
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
  const stampRefs = useRef<Array<HTMLDivElement | null>>([]);
  const collectLineRef = useRef<HTMLDivElement>(null);
  const writingBarRef = useRef<HTMLDivElement>(null);
  const collectedRef = useRef<boolean[]>([]);
  const originsRef = useRef<Map<string, DOMRect>>(new Map());
  // Average row height, used to release each pinned title after about one row
  // so it hands the slot to the next one instead of staying put.
  const [rowSpan, setRowSpan] = useState(0);
  const [collected, setCollected] = useState<boolean[]>([]);
  const [titleOffset, setTitleOffset] = useState(TITLE_OFFSET);
  const [trayWidth, setTrayWidth] = useState(0);

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
    collectedRef.current = [];
    originsRef.current.clear();
    setCollected([]);
  }, [posts]);

  useEffect(() => {
    const bar = writingBarRef.current;
    if (!bar) return;

    const measureBar = () => {
      const bounds = bar.getBoundingClientRect();
      setTrayWidth(Math.round(bounds.width));
      setTitleOffset(Math.round(52 + bounds.height));
    };

    measureBar();
    const observer = new ResizeObserver(measureBar);
    observer.observe(bar);
    window.addEventListener("resize", measureBar);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureBar);
    };
  }, [collected]);

  useEffect(() => {
    const measureRowSpan = () => {
      const heights = postRefs.current
        .filter((row): row is HTMLLIElement => Boolean(row))
        .map((row) => row.getBoundingClientRect().height);

      if (!heights.length) return;

      const total = heights.reduce((sum, height) => sum + height, 0);
      setRowSpan(Math.round(total / heights.length));
    };

    measureRowSpan();
    window.addEventListener("resize", measureRowSpan);
    return () => window.removeEventListener("resize", measureRowSpan);
  }, [sortedPosts]);

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

      // A stamp collects the first time it meets the Writing bar. The list
      // slot stays put — collapsing it would yank the next stamp up into the
      // line and collect the whole deck in one frame.
      const line =
        collectLineRef.current?.getBoundingClientRect().bottom ?? TITLE_OFFSET;
      const previous = collectedRef.current;
      const next = sortedPosts.map((post, index) => {
        if (!post.image) return false;
        const stamp = stampRefs.current[index];
        if (!stamp) return previous[index] ?? false;

        const top = stamp.getBoundingClientRect().top;
        if (!(previous[index] ?? false)) {
          originsRef.current.set(post.slug || post.link, stamp.getBoundingClientRect());
        }

        if (top < line - 4) return true;
        if (top > line + 32) return false;
        return previous[index] ?? false;
      });

      if (
        next.length !== previous.length ||
        next.some((value, index) => value !== previous[index])
      ) {
        collectedRef.current = next;
        setCollected(next);
      }
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
  const albumItems = sortedPosts.flatMap((post, postIndex) => {
    if (!collected[postIndex] || !post.image) return [];
    const seed = post.slug || post.link;
    return [
      {
        href: getPostHref(post),
        origin: originsRef.current.get(seed),
        seed,
        src: post.image,
      },
    ];
  });
  const albumSlots = layoutStampAlbum(
    albumItems.map((item) => item.seed),
    trayWidth
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
      className="mt-8"
    >
      {/* Pinned the same way as the header, not with position:sticky — sticky
          here reproduces the iOS Safari bottom-bar strip every time. */}
      <PinnedShell
        className="relative z-20 -mx-4 px-4 pb-4 pt-4"
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

        <div className="relative" ref={writingBarRef}>
          <div
            className="flex items-baseline justify-between gap-4"
            ref={collectLineRef}
          >
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
          <StampAlbum items={albumItems} slots={albumSlots} />
        </div>
      </PinnedShell>

      <ol className="relative px-1 pb-24 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-border before:content-[''] sm:px-3 sm:before:left-[1.625rem]">
        {timelineEntries.map((entry) => {
          if (entry.kind === "milestone") {
            const { milestone } = entry;

            return (
              <li
                key={milestone.id}
                className="relative grid min-h-24 grid-cols-[1.5rem_1fr] items-center gap-3 sm:grid-cols-[1.75rem_1fr] sm:gap-4"
                data-timeline-highlight={milestone.id}
              >
                <span
                  aria-hidden="true"
                  className="relative z-10 mx-auto size-2.5 rounded-full border-2 border-background bg-accent"
                />
                {/* Same type as a post title — the marker, not a card, is what
                    sets a highlight apart. */}
                <p className="my-5 max-w-prose text-[1.05rem] font-bold leading-snug tracking-[-0.015em] text-foreground">
                  <HighlighterText
                    seed={milestone.id}
                    trailing={
                      <time
                        className="ml-2 whitespace-nowrap text-sm font-normal tracking-normal text-muted/70"
                        dateTime={milestone.date}
                      >
                        • {milestone.label}
                      </time>
                    }
                  >
                    {milestone.text}
                  </HighlighterText>
                </p>
              </li>
            );
          }

          const { post, postIndex } = entry;
          const isSelected = postIndex === selectedPostIndex;
          // 0 for the title currently in the slot, rising for each one passed.
          const titleDepth = Math.min(
            Math.max(selectedPostIndex - postIndex, 0),
            TITLE_HISTORY - 1
          );

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
              {/* min-w-0: grid items default to min-width:auto, which blocks the
                  title's truncate from ever shrinking below its content width. */}
              <div className="min-h-20 min-w-0">
                {/* Pins just below the Writing bar so the title comes to rest in
                    that slot instead of sliding behind it. The shrink/slide sits
                    on an inner node — PinnedShell owns transform on the shell. */}
                <PinnedShell
                  className="relative z-30"
                  offset={titleOffset}
                  releaseAfter={rowSpan || undefined}
                >
                <div
                  className="origin-left transition-[transform,opacity] duration-500 [transition-timing-function:var(--ease-spring)] motion-reduce:transition-none"
                  style={{
                    opacity: titleDepth > 0 ? 0 : 1,
                    transform:
                      titleDepth > 0
                        ? "translateX(-1.25rem) scale(0.78)"
                        : isSelected
                          ? "scale(0.78)"
                          : "scale(1)",
                    // The outgoing title leaves only once the incoming one has
                    // collapsed into the slot — the delay tracks the arriving
                    // title's spring settle. Arriving itself is never delayed.
                    transitionDelay: titleDepth > 0 ? "400ms" : "0ms",
                  }}
                >
                <Link
                  aria-current={isSelected ? "true" : undefined}
                  className={`flex min-h-11 min-w-0 items-center pb-1.5 pt-4 text-[1.05rem] leading-snug tracking-[-0.015em] transition-colors duration-150 motion-reduce:transition-none ${
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
                  <span className="flex min-w-0 items-baseline">
                    <span className="truncate">{post.title}</span>
                    <span
                      className={`ml-2 shrink-0 whitespace-nowrap text-sm font-normal tracking-normal ${
                        isSelected ? "text-muted/70" : "text-muted/45"
                      }`}
                    >
                      • {formatPostDate(post.pubDate)}
                    </span>
                  </span>
                </Link>
                </div>
                </PinnedShell>

                {post.description ? (
                  // Clickable like the title, but hidden from assistive tech and
                  // the tab order — the title link above already points here, and
                  // a second one would announce the same destination twice.
                  <Link
                    aria-hidden="true"
                    className={`mb-6 block max-w-prose text-[0.9rem] leading-relaxed transition-colors duration-150 motion-reduce:transition-none ${
                      isSelected ? "text-muted/75" : "text-muted/45"
                    }`}
                    href={getPostHref(post)}
                    rel={post.slug ? undefined : "noopener noreferrer"}
                    tabIndex={-1}
                    target={post.slug ? undefined : "_blank"}
                  >
                    {formatPostDescription(post.description)}
                  </Link>
                ) : null}

                {post.image ? (
                  <div
                    ref={(node) => {
                      stampRefs.current[postIndex] = node;
                    }}
                    className={`mb-8 overflow-visible py-3 ${
                      collected[postIndex] ? "invisible pointer-events-none" : ""
                    }`}
                  >
                    <PostStamp
                      decorative
                      external={!post.slug}
                      href={getPostHref(post)}
                      seed={post.slug || post.link}
                      sizes={IMAGE_SIZES}
                      src={post.image}
                    />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
