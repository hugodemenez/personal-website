import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fetchSubstackPosts } from '@/server/substack-feed'

export const alt = 'Hugo DEMENEZ - Developer, trader, and entrepreneur'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  // Load background image
  const backgroundData = await readFile(
    join(process.cwd(), 'public/background.png')
  )

  // Convert to base64 for use in ImageResponse
  const backgroundBase64 = `data:image/png;base64,${backgroundData.toString('base64')}`

  // Fetch latest Substack post date
  let lastUpdate = ''
  try {
    const posts = await fetchSubstackPosts()
    if (posts.length > 0) {
      // Sort by date (newest first) and get the latest
      const sortedPosts = [...posts].sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      )
      const latestPost = sortedPosts[0]
      const date = new Date(latestPost.pubDate)
      lastUpdate = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
  } catch (error) {
    console.error('Error fetching Substack posts for OG image:', error)
  }

  const lastUpdateDisplay = lastUpdate ? 'block' : 'none'
  const lastUpdateText = lastUpdate ? `Last update: ${lastUpdate}` : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
        }}
      >
        {/* Background image */}
        <img
          src={backgroundBase64}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Content container - bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '60px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '24px',
            backgroundColor: 'rgba(253, 251, 247, 0.95)',
            borderRadius: '8px',
          }}
        >
          {/* Name */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 900,
              color: '#292524',
              letterSpacing: '-0.02em',
              display: 'block',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          >
            Hugo DEMENEZ
          </div>

          {/* Last update */}
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#57534E',
              display: lastUpdateDisplay,
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.1)',
            }}
          >
            {lastUpdateText}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
