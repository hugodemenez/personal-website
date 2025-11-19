# Hugo DEMENEZ's Personal Website

This is my personal portfolio and blog, built with the latest web technologies.

## ⚡️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Content**: [Next MDX](https://nextjs.org/docs/app/building-your-application/configuring/mdx) for blog posts and pages
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/docs) with Perplexity Sonar model via [AI Gateway](https://vercel.com/docs/ai/ai-gateway)

## 🚀 Features

- **Substack Integration**: 
  - Leverages **Server Component Caching** (`use cache` directive) for optimal performance.
  - Uses [into.md](https://into.md/) to scrape and retrieve Substack posts, rendering them directly as MDX on the blog.
  
- **AI Assistant**:
  - Includes an AI-powered assistant that uses the **Sonar model** to provide relevant information about my current work and background.
  
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
