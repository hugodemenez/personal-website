# Hugo DEMENEZ's Personal Website

This is my personal portfolio and blog, built with the latest web technologies.

## ⚡️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Content**: [Next MDX](https://nextjs.org/docs/app/building-your-application/configuring/mdx) for blog posts and pages

## 🚀 Features

- **Substack Integration**: 
  - Leverages **Server Component Caching** (`use cache` directive) for optimal performance.
  - Fetches posts directly from Substack's API (`/api/v1/posts/{slug}`) and converts HTML to Markdown using a zero-dependency converter, rendering them as MDX on the blog.
  
- **Modern UI**:
  - Clean and responsive design using the latest Tailwind CSS v4 features.
  - Optimized web font loading (Geist & Geist Mono).

## 🛠️ Development

```bash
npm install
npm run dev
```

## ☁️ Deployment

Deployed on [Vercel](https://vercel.com).

### Spotify authorization

The footer reads user-specific Spotify data with the Authorization Code flow. Configure
`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, and
`SPOTIFY_REFRESH_TOKEN` in the deployment environment.

Spotify refresh tokens expire after six months from July 20, 2026. When Spotify returns
`invalid_grant`, the site stops retrying that token and serves the fallback track. To
reauthorize:

1. Open `/api/spotify/authorize` on the deployed site and sign in to Spotify.
2. Replace `SPOTIFY_REFRESH_TOKEN` with the token returned by the callback.
3. Redeploy so all instances discard the expired environment value.
