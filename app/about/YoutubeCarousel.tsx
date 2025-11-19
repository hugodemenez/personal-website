'use client';

import React, { useRef, useState, useEffect } from 'react';

interface YoutubeVideo {
  code: string;
  title: string;
}

interface YoutubeCarouselProps {
  videos: YoutubeVideo[];
}

export default function YoutubeCarousel({ videos }: YoutubeCarouselProps) {
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

  if (!videos.length) return null;

  return (
    <div className="relative w-full">
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {videos.map((video) => (
          <div
            key={video.code}
            className="flex-none w-80 snap-center group"
          >
            <div className="aspect-video w-full relative bg-[#FDFBF7] p-3 shadow-[0_8px_16px_rgba(0,0,0,0.15)] transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)] border-[12px] border-[#5D4037] ring-1 ring-black/20 rounded-[2px]">
              {/* Wood grain effect overlay (subtle) */}
              <div className="absolute inset-0 border-[12px] border-transparent border-t-[#ffffff10] border-l-[#ffffff05] border-b-[#00000010] border-r-[#00000020] pointer-events-none z-20 rounded-[2px]" />
              {/* Frame internal lighting/bevel effect */}
              <div className="absolute inset-0 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-1px_-1px_2px_rgba(255,255,255,0.1)] pointer-events-none z-10" />
              
              <div className="relative w-full h-full overflow-hidden bg-stone-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${video.code}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <h3 className="text-sm font-semibold leading-tight text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                {video.title}
              </h3>
            </div>
          </div>
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


