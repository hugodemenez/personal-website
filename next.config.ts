import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  pageExtensions: ['mdx', 'ts', 'tsx'],
  // Last known city + weather stays in the static shell. `seconds` expires in
  // 60s and is treated as a dynamic hole, which is why the pill always
  // suspended into a skeleton. Revalidate often; expire only after a quiet week.
  cacheLife: {
    location: {
      stale: 300,
      revalidate: 60,
      expire: 604800,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'substackcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'substack-post-media.s3.amazonaws.com',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/image-proxy**',
      },
    ],
  },
  cacheComponents: true,
  allowedDevOrigins: ['localhost', '192.168.1.25', '192.168.0.140'],
  experimental: {
    mdxRs: true,
    viewTransition: true,
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
