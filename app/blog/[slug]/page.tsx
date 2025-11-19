
// import { cacheLife } from 'next/cache';
import { BackButton } from '@/components/back-button';
import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import { mdxComponents } from '@/components/mdx-components-list';
import { Tweet } from 'react-tweet';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}


export default async function BlogPost({ params }: PageProps) {
  'use cache';
  // cacheLife('weeks');

  const { slug } = await params;
  const substackUrl = `https://hugodemenez.substack.com/p/${slug}`;
  // into.md usage: https://into.md/https://hugodemenez.substack.com/p/slug
  const intoMdUrl = `https://into.md/${substackUrl}`;

  try {
    const res = await fetch(intoMdUrl);
    
    if (!res.ok) {
      console.error(`Failed to fetch post from ${intoMdUrl}: ${res.status}`);
      notFound();
    }
    
    const markdown = await res.text();

    // Preprocess markdown to fix specific formatting issues from into.md
    const processedMarkdown = markdown
      // Fix images wrapped in broken links with newlines: [ \n ![](...) \n ](...)
      .replace(/\[\s*(!\[.*?\]\(.*?\))\s*\]\(.*?\)/g, '$1')
      // Convert Twitter/X links (plain or markdown format) on their own line to Tweet components
      // Match plain links: https://x.com/user/status/123456
      .replace(/^[ \t]*https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \n]*)?[ \t\r]*$/gm, '\n<Tweet id="$1" />\n')
      // Match markdown links: [text](https://x.com/user/status/123456)
      .replace(/^[ \t]*\[.*?\]\(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \n\)]*)?\)[ \t\r]*$/gm, '\n<Tweet id="$1" />\n')
      // Match markdown links anywhere: [text](https://x.com/user/status/123456)
      .replace(/\[.*?\]\(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \n\)]*)?\)/g, '\n\n<Tweet id="$1" />\n\n')
      // Match inline links: text https://x.com/user/status/123456
      .replace(/(^|[^\[(])(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d+)(?:\?[^ \s\n)]*)?)/g, '$1\n\n<Tweet id="$3" />\n\n')


      console.log(processedMarkdown);
    // Compile MDX
    const { content } = await compileMDX({
      source: processedMarkdown,
      options: { parseFrontmatter: true },
      components: mdxComponents,
    });
    return (
        <div>
          <div className="mb-8">
            <BackButton />
          </div>
          <article className="prose prose-stone dark:prose-invert">
            {content}
          </article> 
        </div>
      );
  } catch (error) {
    console.error('Error fetching blog post:', error);
    notFound();
  }
}