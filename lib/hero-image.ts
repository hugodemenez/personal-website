import { SubstackPostData } from "@/server/substack-post";

export interface HeroImageResult {
  imageUrl: string;
  proxiedImageUrl: string;
  source: "cover" | "body" | "default";
}

const DEFAULT_IMAGE = "/images/social.png";

function buildProxyUrl(url: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function extractFirstImageFromHtml(html?: string | null): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']?([^"'>\s]+)["']?/i);
  return match?.[1] ?? null;
}

export function deriveHeroImage(post?: SubstackPostData | null): HeroImageResult {
  const cover = post?.cover_image?.trim();
  if (cover) {
    const imageUrl = cover;
    return {
      imageUrl,
      proxiedImageUrl: buildProxyUrl(imageUrl),
      source: "cover",
    };
  }

  const bodyImage = extractFirstImageFromHtml(post?.body_html);
  if (bodyImage) {
    return {
      imageUrl: bodyImage,
      proxiedImageUrl: buildProxyUrl(bodyImage),
      source: "body",
    };
  }

  return {
    imageUrl: DEFAULT_IMAGE,
    proxiedImageUrl: DEFAULT_IMAGE,
    source: "default",
  };
}
