import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const withNextra = require('nextra')('nextra-theme-blog', './theme.config.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['substackcdn.com', 'substack-post-media.s3.amazonaws.com'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // Enable View Transitions API
    viewTransition: true,
    
    // Forward browser logs to terminal for debugging
    browserDebugInfoInTerminal: true,
  },
  // Enable modern output with optimizations
  // output: 'standalone', // Commented out to keep API routes working
  
  // Optimize bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enable modern module resolution
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
};

export default withNextra(nextConfig);
