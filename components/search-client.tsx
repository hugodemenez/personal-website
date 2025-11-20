'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { PostMetadata } from '@/lib/posts';

interface SearchClientProps {
  posts: PostMetadata[];
}

export function SearchClient({ posts }: SearchClientProps) {
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter posts - show all if no query, otherwise filter
  const filteredPosts = query
    ? posts.filter((post) => {
        const searchContent = `${post.title} ${post.description} ${post.tags.join(' ')}`.toLowerCase();
        return searchContent.includes(query.toLowerCase());
      })
    : posts;

  const handleOpen = () => {
    dialogRef.current?.showModal();
    // Focus input after dialog opens
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleClose = () => {
    dialogRef.current?.close();
    setQuery('');
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
        className="w-full h-full md:w-[42rem] md:h-auto md:rounded-lg border-0 md:border md:border-border bg-background p-0 md:shadow-xl transition-opacity overflow-hidden"
        onClose={handleClose}
      >
        <div className="flex flex-col h-full md:h-auto md:max-h-[80vh] relative overflow-hidden md:rounded-lg">
          {/* Input - fixed at top on both mobile and desktop */}
          <div className="flex items-center px-4 py-3 border-b border-border bg-background flex-shrink-0">
            <svg
              className="text-muted mr-2 flex-shrink-0"
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
          <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain pb-72 md:pb-0">
            <div className="py-2">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/posts/${post.slug}`}
                    onClick={handleClose}
                    className="block px-4 py-3 text-sm hover:bg-surface transition-colors border-b border-border last:border-b-0 focus:outline-none focus:bg-surface"
                  >
                    <div className="font-medium text-foreground">{post.title}</div>
                    {post.description && (
                      <div className="text-xs text-muted mt-1 line-clamp-1">
                        {post.description}
                      </div>
                    )}
                    {post.tags.length > 0 && (
                      <div className="text-xs text-muted mt-1.5">
                        {post.tags.join(', ')}
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
