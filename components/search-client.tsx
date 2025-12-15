'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import type { PostMetadata } from '@/lib/posts';

interface SearchClientProps {
  posts: PostMetadata[];
}

export function SearchClient({ posts }: SearchClientProps) {
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [posts]
  );

  // Filter posts - show all if no query, otherwise filter
  const filteredPosts = query
    ? sortedPosts.filter((post) => {
        const searchContent = `${post.title} ${post.description} ${post.tags.join(' ')}`.toLowerCase();
        return searchContent.includes(query.toLowerCase());
      })
    : sortedPosts;

  const handleOpen = () => {
    dialogRef.current?.showModal();
    // Focus input after dialog opens
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleClose = () => {
    dialogRef.current?.close();
    setQuery('');
  };

  // Handle backdrop clicks to close dialog
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // If click is directly on the dialog element (backdrop), close it
    if (e.target === dialogRef.current) {
      handleClose();
    }
  };

  // Handle escape key (native dialog handles this, but we clear query)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = () => {
      setQuery('');
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, []);

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-2 text-muted hover:text-accent transition-colors"
        aria-label="Search posts"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        className="
          fixed inset-0 m-0 box-border
          h-full w-full max-h-none max-w-none overflow-hidden
          border-0 bg-background p-0
          transition-opacity
          md:inset-auto md:top-[10%] md:left-1/2 md:right-auto md:bottom-auto
          md:h-auto md:w-2xl md:max-h-[80vh] md:max-w-2xl
          md:-translate-x-1/2 md:rounded-lg md:border md:border-border md:shadow-xl
        "
        onClose={handleClose}
        onClick={handleDialogClick}
      >
        <div className="flex flex-col h-full md:h-auto md:max-h-[80vh] relative overflow-hidden md:rounded-lg">
          {/* Input - fixed at top on both mobile and desktop */}
          <div className="flex items-center px-4 py-3 border-b border-border bg-background flex-shrink-0">
            <svg
              className="text-muted mr-2 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts..."
              className="flex-1 bg-transparent outline-none text-base md:text-sm placeholder:text-muted text-foreground"
              autoFocus
            />
            <button
              onClick={handleClose}
              className="text-muted hover:text-foreground ml-2 p-1 flex-shrink-0 rounded transition-colors"
              aria-label="Close search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Results - appears below input on both mobile and desktop */}
          <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain pb-80 md:pb-0">
            <div className="py-2">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/posts/${post.slug}`}
                    onClick={handleClose}
                    className="block px-4 py-3 text-sm hover:bg-surface transition-colors border-b border-border last:border-b-0 focus:outline-none focus:bg-surface"
                  >
                    <div className="flex items-center justify-between">
                    <div className="font-medium text-foreground">{post.title}</div>
                    <div className="text-xs text-muted mt-1">{formatDate(post.date)}</div>
                    </div>
                    {post.description && (
                      <div className="text-xs text-muted mt-1 line-clamp-1">
                        {post.description}
                      </div>
                    )}
                  </Link>
                ))
              ) : (
                <div className="px-4 py-8 text-sm text-muted text-center">
                  {query ? 'No results found' : 'No posts available'}
                </div>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
