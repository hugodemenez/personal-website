import { Suspense } from 'react';
import Link from 'next/link';
import { getTweet } from '@/lib/tweet/getTweet';
import type { Tweet } from '@/lib/tweet/types';
import { parseTweetEntities, type TweetSegment } from '@/lib/tweet/parseEntities';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? 'now' : `${diffMinutes}m`;
    }
    return `${diffHours}h`;
  }

  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}mo`;
  }

  const years = Math.floor(diffDays / 365);
  return `${years}y`;
}

function TweetSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-border" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-border rounded w-1/3" />
          <div className="h-4 bg-border rounded w-full" />
          <div className="h-4 bg-border rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

function TweetNotFound({ id }: { id: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <p className="text-muted text-sm mb-2">Tweet unavailable</p>
      <Link
        href={`https://x.com/i/web/status/${id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:text-accent-light text-sm transition-colors duration-200 ease"
      >
        View on X →
      </Link>
    </div>
  );
}

async function TweetContent({ id }: { id: string }) {
  const tweet = await getTweet(id);

  if (!tweet) {
    return <TweetNotFound id={id} />;
  }

  const tweetUrl = `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`;
  const userUrl = `https://x.com/${tweet.user.screen_name}`;

  return (
    <article className="bg-surface border border-border rounded-lg p-4">
      {/* Header */}
      <header className="flex items-start gap-3 mb-3">
        <Link
          href={userUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          <img
            src={tweet.user.profile_image_url_https}
            alt={`${tweet.user.name}'s profile picture`}
            className={`w-12 h-12 rounded-full ${
              tweet.user.profile_image_shape === 'Square' ? 'rounded-lg' : ''
            }`}
            loading="lazy"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={userUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:text-accent transition-colors duration-200 ease"
            >
              {tweet.user.name}
            </Link>
            <Link
              href={userUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted text-sm hover:text-accent transition-colors duration-200 ease"
            >
              @{tweet.user.screen_name}
            </Link>
            {tweet.user.verified && (
              <span className="text-accent" aria-label="Verified account">
                ✓
              </span>
            )}
            <span className="text-muted text-sm">·</span>
            <time
              dateTime={tweet.created_at}
              className="text-muted text-sm"
            >
              {formatDate(tweet.created_at)}
            </time>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mb-3">
        <p className="text-foreground whitespace-pre-wrap wrap-break-word">
          {(() => {
            try {
              const segments = parseTweetEntities(tweet);
              return segments.map((segment, idx) => {
                if (segment.type === 'text') {
                  return <span key={idx}>{segment.text}</span>;
                }
                return (
                  <Link
                    key={idx}
                    href={segment.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-light hover:underline transition-colors duration-200 ease"
                  >
                    {segment.text}
                  </Link>
                );
              });
            } catch (error) {
              // Fallback to plain text if parsing fails
              console.error('Error parsing tweet entities:', error);
              const endIndex = tweet.display_text_range?.[1] ?? tweet.text.length;
              return <span>{tweet.text.slice(0, endIndex)}</span>;
            }
          })()}
        </p>
      </div>

      {/* Media */}
      {tweet.mediaDetails && tweet.mediaDetails.length > 0 && (
        <div
          className={`mb-3 rounded-lg overflow-hidden border border-border ${
            tweet.mediaDetails.length === 1
              ? 'max-w-full'
              : 'grid grid-cols-2 gap-1'
          }`}
        >
          {tweet.mediaDetails.slice(0, 4).map((media, idx) => (
            <img
              key={idx}
              src={media.media_url_https}
              alt={media.ext_alt_text || `Tweet image ${idx + 1}`}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* Card Preview (Link Preview with OG Image) */}
      {(tweet as any).cardUrl && (
        <Link
          href={(tweet as any).cardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-3 border border-border rounded-lg overflow-hidden hover:border-accent/30 transition-colors duration-200 ease group"
        >
          {(tweet as any).cardImage && (
            <div className="w-full aspect-video bg-surface overflow-hidden">
              <img
                src={(tweet as any).cardImage}
                alt={(tweet as any).cardTitle || 'Link preview'}
                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity duration-200 ease"
                loading="lazy"
              />
            </div>
          )}
          <div className={`p-3 bg-surface ${(tweet as any).cardImage ? '' : 'pt-3'}`}>
            {(tweet as any).cardDomain && (
              <div className="text-xs text-muted mb-1 uppercase tracking-wide">
                {(tweet as any).cardDomain}
              </div>
            )}
            {(tweet as any).cardTitle && (
              <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-accent transition-colors duration-200 ease">
                {(tweet as any).cardTitle}
              </h3>
            )}
            {(tweet as any).cardDescription && (
              <p className="text-xs text-muted line-clamp-2">
                {(tweet as any).cardDescription}
              </p>
            )}
            {!(tweet as any).cardTitle && !(tweet as any).cardDescription && (
              <div className="text-sm text-accent group-hover:text-accent-light transition-colors duration-200 ease">
                {(tweet as any).cardDisplayUrl || (tweet as any).cardUrl} →
              </div>
            )}
          </div>
        </Link>
      )}

      {/* Footer */}
      <footer className="pt-2 border-t border-border">
        <Link
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-light text-sm transition-colors duration-200 ease inline-flex items-center gap-1"
        >
          View on X →
        </Link>
      </footer>
    </article>
  );
}

export function Tweet({ id }: { id: string }) {
  return (
    <Suspense fallback={<TweetSkeleton />}>
      <TweetContent id={id} />
    </Suspense>
  );
}

