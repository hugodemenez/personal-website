import React from "react";
import Link from "next/link";

const VIDEOS = [
  {
    code: "K2QuAwVl1oI",
    title: "Interview about my trading journey and strategies",
    description: undefined,
    channelName: undefined,
  },
  {
    code: "zC-7tx3ar0w",
    title: "Discussion about quantitative trading and machine learning",
    description: undefined,
    channelName: undefined,
  },
  {
    code: "CeWglVNpevk",
    title: "My testimony after 1 year of trading",
    description: undefined,
    channelName: undefined,
  },
];

function LinkIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function YouTubeChannelLogo() {
  return (
    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
      <svg
        className="w-5 h-5 text-accent"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    </div>
  );
}

function YouTubeVideoCard({
  code,
  title,
  description,
  channelName,
}: {
  code: string;
  title: string;
  description?: string;
  channelName?: string;
}) {
  const videoUrl = `https://www.youtube.com/watch?v=${code}`;

  return (
    <Link
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 p-4 rounded-lg border border-border bg-surface hover:bg-surface/80 transition-colors duration-200 ease"
    >
      {/* Channel Logo */}
      <div className="shrink-0">
        <YouTubeChannelLogo />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-foreground group-hover:text-accent transition-colors duration-200 ease">
            {title}
          </h3>
          <LinkIcon />
        </div>

        {description && (
          <p className="text-sm text-muted line-clamp-2 mb-2">{description}</p>
        )}

        {channelName && <p className="text-xs text-muted">{channelName}</p>}
      </div>
    </Link>
  );
}

export default function YouTubeVideos() {
  return (
    <div className="flex flex-col gap-4 pb-4">
      {VIDEOS.map((video) => (
        <YouTubeVideoCard
          key={video.code}
          code={video.code}
          title={video.title}
          description={video.description}
          channelName={video.channelName}
        />
      ))}
    </div>
  );
}