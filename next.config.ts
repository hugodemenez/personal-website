import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  pageExtensions: ['mdx', 'ts', 'tsx'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'substackcdn.com',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/image-proxy**',
      },
    ],
  },
  cacheComponents: true,
  allowedDevOrigins: ['localhost', '192.168.1.25'],
  experimental: {
    mdxRs: true,
    viewTransition: true,
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
