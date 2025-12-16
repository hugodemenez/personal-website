import { cacheLife } from "next/cache";
import { researchAgent } from "@/server/search-agent";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "./mdx-components-list";
import { Suspense } from "react";

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
            ), a web-based trading journal that syncs with brokers like Rithmic, analyzes performance with AI insights, and helps futures traders track progress across accounts.
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
            , Substack, and GitHub, I share on discretionary trading, quant strategies, and building tools like SteinPrograms for automated trading.
          </p>
        </div>
      }
    >
      <CachedGeneratedContent />
    </Suspense>
  );
}
async function CachedGeneratedContent() {
  "use cache";
  cacheLife("days");
  
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
          ), a web-based trading journal that syncs with brokers like Rithmic, analyzes performance with AI insights, and helps futures traders track progress across accounts.
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
          , Substack, and GitHub, I share on discretionary trading, quant strategies, and building tools like SteinPrograms for automated trading.
        </p>
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

  return <div>{content}</div>;
}
