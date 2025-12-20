import { cacheLife, cacheTag } from "next/cache";
import { researchAgent } from "@/server/search-agent";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "./mdx-components-list";
import { Suspense } from "react";
import { RefreshButton } from "./refresh-button";

export default function GeneratedContent() {
  return (
    <Suspense
      fallback={
        <div>
          <p className="mb-4 leading-relaxed text-muted">
            I'm a developer, trader, and entrepreneur from Northern France.
          </p>
          <p className="mb-4 leading-relaxed text-muted">
            I founded <strong>Deltalytix</strong> (
            <a
              className="text-accent hover:text-accent-light hover:underline transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.deltalytix.app"
            >
              deltalytix.app
            </a>
            ), a web-based trading journal that syncs with brokers like Rithmic,
            analyzes performance with AI insights, and helps futures traders
            track progress across accounts.
          </p>
          <p className="mb-4 leading-relaxed text-muted">
            Through{" "}
            <a
              className="text-accent hover:text-accent-light hover:underline transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.hugodemenez.fr"
            >
              my site
            </a>
            , Substack, and GitHub, I share on discretionary trading, quant
            strategies, and building tools like SteinPrograms for automated
            trading.
          </p>
          <GeneratedContentFooter cachedAt={new Date('2025-12-20T12:00:00Z')} />
        </div>
      }
    >
      <CachedGeneratedContent />
    </Suspense>
  );
}

function GeneratedContentFooter({ cachedAt }: { cachedAt: Date }) {
  return (
    <footer className="flex items-center gap-2">
      <p className="text-muted text-sm">
        Generated on {cachedAt.toLocaleString()}
      </p>
      <span className="text-muted text-sm">|</span>
      <RefreshButton />
    </footer>
  );
}
async function CachedGeneratedContent() {
  "use cache";
  cacheLife("days");
  cacheTag("generated-content");

  // Save time it was cached
  const cachedAt = new Date();

  // In development mode, skip the expensive AI call and return fallback content
  // The cache doesn't work in dev mode, so this prevents slow page loads
  if (process.env.NODE_ENV === "development") {
    return (
      <div>
        <p className="mb-4 leading-relaxed text-muted">
          I'm a developer, trader, and entrepreneur from Northern France.
        </p>
        <p className="mb-4 leading-relaxed text-muted">
          I founded <strong>Deltalytix</strong> (
          <a
            className="text-accent hover:text-accent-light hover:underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.deltalytix.app"
          >
            deltalytix.app
          </a>
          ), a web-based trading journal that syncs with brokers like Rithmic,
          analyzes performance with AI insights, and helps futures traders track
          progress across accounts.
        </p>
        <p className="mb-4 leading-relaxed text-muted">
          Through{" "}
          <a
            className="text-accent hover:text-accent-light hover:underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.hugodemenez.fr"
          >
            my site
          </a>
          , Substack, and GitHub, I share on discretionary trading, quant
          strategies, and building tools like SteinPrograms for automated
          trading.
        </p>
        <GeneratedContentFooter cachedAt={cachedAt} />
      </div>
    );
  }

  const result = await researchAgent.generate({
    prompt: "Who is Hugo Demenez and what are his projects?",
  });

  const { content } = await compileMDX({
    source: result.text,
    options: { parseFrontmatter: true },
    components: mdxComponents,
  });

  return (
    <div>
      {content}
      <GeneratedContentFooter cachedAt={cachedAt} />
    </div>
  );
}
