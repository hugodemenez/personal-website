import fs from 'fs';
import path from 'path';

export interface PostMetadata {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  author?: string;
}

const POSTS_DIRECTORY = path.join(process.cwd(), 'app/posts');

export async function getPosts(): Promise<PostMetadata[]> {
  if (!fs.existsSync(POSTS_DIRECTORY)) {
    return [];
  }

  const entries = fs.readdirSync(POSTS_DIRECTORY, { withFileTypes: true });
  
  const posts = await Promise.all(
    entries
      .filter(entry => entry.isDirectory())
      .map(async (dir) => {
        const slug = dir.name;
        // We need to check if the file exists before importing to avoid errors
        const filePath = path.join(POSTS_DIRECTORY, slug, 'page.mdx');
        
        if (!fs.existsSync(filePath)) {
          return null;
        }

        try {
          // Dynamic import of the MDX file to get the exported metadata
          // Note: This relies on Next.js/Webpack being able to resolve this dynamic path
          const { metadata } = await import(`@/app/posts/${slug}/page.mdx`);

          return {
            slug,
            title: metadata.title || slug,
            date: metadata.date || new Date().toISOString(),
            description: metadata.description || '',
            tags: metadata.tags || [],
            author: metadata.author,
          } as PostMetadata;
        } catch (error) {
          console.error(`Error loading metadata for ${slug}:`, error);
          return null;
        }
      })
  );

  return posts
    .filter((post): post is PostMetadata => post !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
