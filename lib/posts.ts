import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getSubstackPosts, SubstackPost } from './substack-static';

export interface MDXPost {
  slug: string;
  title: string;
  date: string;
  description?: string;
  tag?: string;
  author?: string;
  content: string;
  source: 'mdx';
  readingTime?: number;
}

export interface UnifiedPost {
  slug: string;
  title: string;
  date: string;
  description?: string;
  tag?: string;
  author?: string;
  content?: string;
  source: 'mdx' | 'substack';
  link?: string;
  image?: string;
  readingTime?: number;
  guid?: string;
}

const postsDirectory = path.join(process.cwd(), 'pages/posts');

// Calculate reading time (rough estimate)
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Get all MDX posts
export function getMDXPosts(): MDXPost[] {
  try {
    if (!fs.existsSync(postsDirectory)) {
      return [];
    }

    const fileNames = fs.readdirSync(postsDirectory);
    const posts = fileNames
      .filter((name) => name.endsWith('.mdx'))
      .map((name) => {
        const fullPath = path.join(postsDirectory, name);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);
        
        const slug = name.replace(/\.mdx$/, '');
        
        return {
          slug,
          title: data.title || slug.replace(/-/g, ' '),
          date: data.date || new Date().toISOString(),
          description: data.description || '',
          tag: data.tag || '',
          author: data.author || 'Hugo Demenez',
          content,
          source: 'mdx' as const,
          readingTime: calculateReadingTime(content),
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Most recent first
      });

    return posts;
  } catch (error) {
    console.error('Error fetching MDX posts:', error);
    return [];
  }
}

// Convert Substack post to unified format
function substackToUnified(post: SubstackPost): UnifiedPost {
  return {
    slug: post.slug || post.guid || post.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
    title: post.title,
    date: post.pubDate,
    description: post.description,
    tag: 'substack',
    author: post.author || 'Hugo Demenez',
    source: 'substack',
    link: post.link,
    image: post.image,
    guid: post.guid,
  };
}

// Convert MDX post to unified format
function mdxToUnified(post: MDXPost): UnifiedPost {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    description: post.description,
    tag: post.tag,
    author: post.author,
    content: post.content,
    source: 'mdx',
    link: `/posts/${post.slug}`,
    readingTime: post.readingTime,
  };
}

// Get all posts (MDX + Substack) unified
export async function getAllPosts(includeSubstack = true): Promise<UnifiedPost[]> {
  try {
    const mdxPosts = getMDXPosts();
    const unifiedMDXPosts = mdxPosts.map(mdxToUnified);

    if (!includeSubstack) {
      return unifiedMDXPosts;
    }

    const substackPosts = await getSubstackPosts();
    const unifiedSubstackPosts = substackPosts.map(substackToUnified);

    // Combine and sort by date
    const allPosts = [...unifiedMDXPosts, ...unifiedSubstackPosts];
    
    return allPosts.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Most recent first
    });
  } catch (error) {
    console.error('Error fetching all posts:', error);
    // Return just MDX posts if Substack fails
    const mdxPosts = getMDXPosts();
    return mdxPosts.map(mdxToUnified);
  }
}

// Get posts by tag
export async function getPostsByTag(tag: string): Promise<UnifiedPost[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter(post => 
    post.tag?.toLowerCase() === tag.toLowerCase()
  );
}

// Get featured posts (recent + high quality)
export async function getFeaturedPosts(limit = 6): Promise<UnifiedPost[]> {
  const allPosts = await getAllPosts();
  
  // Prioritize posts with descriptions and recent dates
  const scoredPosts = allPosts.map(post => {
    let score = 0;
    
    // Recent posts get higher scores
    const daysSincePublished = (Date.now() - new Date(post.date).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - daysSincePublished); // Max 30 points for recent posts
    
    // Posts with descriptions get bonus
    if (post.description && post.description.length > 50) {
      score += 20;
    }
    
    // Posts with images get bonus
    if (post.image) {
      score += 10;
    }
    
    // MDX posts get slight bonus for being local content
    if (post.source === 'mdx') {
      score += 5;
    }
    
    return { ...post, score };
  });
  
  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Generate static props for unified posts
export async function getUnifiedPostsStaticProps() {
  try {
    const posts = await getAllPosts();
    
    return {
      props: {
        posts,
        lastUpdated: new Date().toISOString(),
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error('Error in getUnifiedPostsStaticProps:', error);
    
    return {
      props: {
        posts: [],
        lastUpdated: new Date().toISOString(),
      },
      revalidate: 300, // Retry in 5 minutes if there was an error
    };
  }
}