import { PostStamp } from "@/app/_components/post-stamp";
import { PinnedShell } from "@/app/_components/pinned-shell";
import { SharedTransition } from "@/app/_components/shared-transition";
import { getAlbumPiece } from "@/lib/stamp-album";
import {
  postDateTransitionName,
  postStampTransitionName,
  postTitleTransitionName,
} from "@/lib/view-transitions";
import type { SubstackPost } from "@/types/substack-post";

function formatPostDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PostHeader({ post }: { post: SubstackPost }) {
  const piece = post.image ? getAlbumPiece(post.slug) : null;

  return (
    <PinnedShell className="relative z-30 -mx-4 mb-6 px-4 pb-3 pt-2" offset={52}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-background"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-full h-8 bg-linear-to-b from-background to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <div className="relative">
        <div className="mt-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {/* Same serif treatment as "Hugo Demenez" and the Writing heading —
                one step down in scale because this one is pinned. */}
            <SharedTransition name={postTitleTransitionName(post.slug)}>
              <h1 className="mb-0 font-serif text-3xl leading-[1.05] tracking-[-0.035em] text-foreground sm:text-4xl">
                {post.title}
              </h1>
            </SharedTransition>
            {post.pubDate ? (
              <SharedTransition name={postDateTransitionName(post.slug)}>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <time
                    className="text-sm font-medium tracking-wide text-muted"
                    dateTime={post.pubDate}
                  >
                    {formatPostDate(post.pubDate)}
                  </time>
                </div>
              </SharedTransition>
            ) : null}
          </div>
          {piece && post.image ? (
            <SharedTransition name={postStampTransitionName(post.slug)}>
              <span
                className="relative mt-1 block shrink-0"
                style={{ width: piece.width, height: piece.height }}
              >
                <span
                  className="block"
                  style={{ transform: `rotate(${piece.rotate}deg)` }}
                >
                  <PostStamp
                    alt=""
                    decorative
                    seed={post.slug}
                    sizes="96px"
                    src={post.image}
                    variant="album"
                  />
                </span>
              </span>
            </SharedTransition>
          ) : null}
        </div>
      </div>
    </PinnedShell>
  );
}
