'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SubstackPost } from '@/lib/substack-feed';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

interface SubstackCarouselProps {
  posts: SubstackPost[];
}

export default function SubstackCarousel({ posts }: SubstackCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showRightFade, setShowRightFade] = useState(true);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    
    const isEnd = Math.abs(el.scrollWidth - el.clientWidth - el.scrollLeft) < 5;
    setShowRightFade(!isEnd);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      // Initial check
      checkScroll();
      
      // Check on resize too since clientWidth changes
      window.addEventListener('resize', checkScroll);
      
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  if (!posts.length) return null;

  return (
    <div className="relative w-full">
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {posts.map((post) => (
          <Link
            key={post.link}
            href={post.slug ? `/blog/${post.slug}` : post.link}
            target={post.slug ? undefined : "_blank"}
            rel={post.slug ? undefined : "noopener noreferrer"}
            className="flex-none w-80 snap-center group cursor-pointer"
          >
            <div className="aspect-video w-full relative bg-[#FDFBF7] p-3 shadow-[0_8px_16px_rgba(0,0,0,0.15)] transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)] border-[12px] border-[#5D4037] ring-1 ring-black/20 rounded-[2px]">
              {/* Wood grain effect overlay (subtle) */}
              <div className="absolute inset-0 border-[12px] border-transparent border-t-[#ffffff10] border-l-[#ffffff05] border-b-[#00000010] border-r-[#00000020] pointer-events-none z-20 rounded-[2px]" />
              {/* Frame internal lighting/bevel effect */}
              <div className="absolute inset-0 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-1px_-1px_2px_rgba(255,255,255,0.1)] pointer-events-none z-10" />
              
              <div className="relative w-full h-full overflow-hidden bg-stone-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="160px"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface text-muted/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-12 h-12"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                      />
                    </svg>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                {formatDate(post.pubDate)}
              </p>
              <h3 className="text-sm font-semibold leading-tight text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                {post.title}
              </h3>
            </div>
          </Link>
        ))}
        {/* Spacer at the end to let the last item scroll fully into view if needed */}
        <div className="w-4 flex-none" />
      </div>

      {/* Gradient Fade Overlay */}
      <div 
        className={`pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent transition-opacity duration-300 ${
          showRightFade ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
