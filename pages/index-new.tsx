import React from 'react';
import Image from 'next/image';
import StaticSubstackFeed from '../components/StaticSubstackFeed';
import YouTube from '../components/youtube-viewer';
import { getSubstackStaticProps } from '../lib/substack-static';
import type { SubstackPost } from '../lib/substack-static';

interface IndexPageProps {
  posts: SubstackPost[];
  lastUpdated: string;
}

export default function IndexPage({ posts, lastUpdated }: IndexPageProps) {
  const currentYear = new Date().getFullYear();
  const yearsOfExperience = currentYear - 2018;

  return (
    <article className="prose prose-gray max-w-none">
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Programming</h2>
          <p className="text-lg mb-6">
            For the past <span className="font-semibold">{yearsOfExperience}</span> years,
            I have been driven by programming and investing.
          </p>
          
          <div className="my-8">
            <Image
              src="https://raw.githubusercontent.com/hugodemenez/hugodemenez/main/metrics.plugin.wakatime.svg"
              alt="Wakatime metrics"
              width={1125}
              height={750}
              priority
              className="rounded-lg shadow-lg"
              style={{
                width: '100%',
                height: 'auto',
              }}
            />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Sharing my thoughts</h2>
          <p className="text-lg mb-6">
            Every week, I share my thoughts on{' '}
            <a 
              href="https://substack.com/@hugodemenez"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Substack
            </a>
            . Here you can find some of my posts:
          </p>
          
          <StaticSubstackFeed 
            initialPosts={posts} 
            lastUpdated={lastUpdated}
            enableLiveUpdates={true}
          />
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Interviews</h2>
          <p className="text-lg mb-6">
            I've been fortunate to share my journey and insights in various interviews:
          </p>
          
          <div className="space-y-8">
            <YouTube 
              code="K2QuAwVl1oI" 
              title="Interview about my trading journey and strategies" 
            />
            
            <YouTube 
              code="zC-7tx3ar0w" 
              title="Discussion about quantitative trading and machine learning" 
            />
          </div>
        </section>
      </div>
    </article>
  );
}

// Static generation with revalidation
export const getStaticProps = getSubstackStaticProps;