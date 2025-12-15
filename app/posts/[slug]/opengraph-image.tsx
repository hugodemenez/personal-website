import { ImageResponse } from 'next/og';
import { fetchSubstackPosts } from '@/lib/substack-feed';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

const FALLBACK_BG = '#FDFBF7';
const TEXT_COLOR = '#292524';
const MUTED_TEXT = '#57534E';
const ACCENT = '#EA580C';

type OgImageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function Image({ params }: OgImageProps) {
  const { slug } = await params;

  let post =
    undefined as
      | {
          title: string;
          image?: string;
          pubDate: string;
          description?: string;
        }
      | undefined;

  try {
    const posts = await fetchSubstackPosts();
    post = posts.find((p) => p.slug === slug);
  } catch (error) {
    console.error('Error fetching Substack posts for post OG image:', error);
  }

  // Fallback image if we can't find the post in the feed
  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            padding: '60px',
            backgroundColor: FALLBACK_BG,
          }}
        >
          <div
            style={{
              padding: '24px 32px',
              borderRadius: '16px',
              backgroundColor: 'rgba(242, 239, 233, 0.96)',
              boxShadow: '0 24px 45px rgba(0, 0, 0, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '46px',
                fontWeight: 800,
                color: TEXT_COLOR,
                letterSpacing: '-0.03em',
              }}
            >
              Hugo DEMENEZ
            </div>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 600,
                color: MUTED_TEXT,
              }}
            >
              Personal blog
            </div>
          </div>
        </div>
      ),
      size,
    );
  }

  const date = new Date(post.pubDate);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const hasImage = Boolean(post.image);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          backgroundColor: FALLBACK_BG,
          overflow: 'hidden',
        }}
      >
        {/* Post image background, if available */}
        {hasImage && (
          <img
            src={post.image as string}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Gradient overlay for readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: hasImage
              ? 'linear-gradient(120deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 40%, rgba(253,251,247,0.2) 100%)'
              : 'none',
          }}
        />

        {/* Content card anchored bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '60px',
            maxWidth: '70%',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '26px 32px',
            backgroundColor: hasImage
              ? 'rgba(253, 251, 247, 0.96)'
              : 'rgba(242, 239, 233, 0.98)',
            borderRadius: '18px',
            boxShadow: '0 26px 50px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: ACCENT,
            }}
          >
            Blog post
          </div>

          <div
            style={{
              fontSize: '42px',
              fontWeight: 800,
              color: TEXT_COLOR,
              letterSpacing: '-0.04em',
              lineHeight: 1.08,
            }}
          >
            {post.title}
          </div>

          {post.description && (
            <div
              style={{
                fontSize: '22px',
                fontWeight: 500,
                color: MUTED_TEXT,
                lineHeight: 1.4,
              }}
            >
              {post.description}
            </div>
          )}

          <div
            style={{
              marginTop: '6px',
              fontSize: '20px',
              fontWeight: 600,
              color: MUTED_TEXT,
            }}
          >
            {formattedDate}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}


