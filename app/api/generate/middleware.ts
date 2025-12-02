import { processMarkdown } from "@/lib/markdown";
import {
  LanguageModelV3Source,
  type LanguageModelV3StreamPart,
} from "@ai-sdk/provider";
import { Redis } from "@upstash/redis";
import { type LanguageModelMiddleware, simulateReadableStream } from "ai";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Extract user prompt from params for cache key generation
 */
function extractUserPrompt(params: any): string {
  try {
    const promptArr = Array.isArray(params.prompt) ? params.prompt : [];
    if (
      promptArr.length > 1 &&
      promptArr[1].content &&
      Array.isArray(promptArr[1].content) &&
      promptArr[1].content.length > 0 &&
      promptArr[1].content[0].type === "text"
    ) {
      return promptArr[1].content[0].text.trim();
    } else {
      return JSON.stringify(params.prompt); // fallback
    }
  } catch {
    return JSON.stringify(params.prompt);
  }
}

export const cacheMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",
  wrapStream: async ({ doStream, params }) => {
    // WE HAVE TWO POSSIBLE CACHED STREAMS (search and final response)

    // Extract just the user prompt text for caching to ensure identical prompts are cached together,
    // regardless of tool call details.
    const userPrompt = extractUserPrompt(params);

    // Check if the result is in the cache
    const cachedSearch = (await redis.get(
      `${userPrompt}-search`
    )) as LanguageModelV3StreamPart[];
    const cachedFinal = (await redis.get(
      `${userPrompt}-final`
    )) as LanguageModelV3StreamPart[];

    // If cached, return a simulated ReadableStream that yields the cached result
    if (cachedSearch !== null && cachedFinal !== null) {
      // Combine the cached search and final responses
      const combinedResponse = [...cachedSearch, ...cachedFinal];

      return {
        stream: simulateReadableStream({
          // initialDelayInMs: 0,
          // chunkDelayInMs: 10,
          chunks: combinedResponse,
        }),
      };
    }

    // If not cached, proceed with streaming
    const { stream, ...rest } = await doStream();

    const fullResponse: LanguageModelV3StreamPart[] = [];
    let isSearchStream = false;

    const transformStream = new TransformStream<
      LanguageModelV3StreamPart,
      LanguageModelV3StreamPart
    >({
      transform(chunk, controller) {
        // Detect if this is a tool call (searchTool, step-start, etc.)
        if (chunk.type === "response-metadata") {
          if (chunk.modelId?.includes("gpt")) {
            isSearchStream = false;
          } else {
            isSearchStream = true;
          }
        }
        fullResponse.push(chunk);
        controller.enqueue(chunk);
      },
      flush() {
        // Do NOT cache if the response includes a tool-input-start or tool-searchTool or step-start chunk of any kind,
        // regardless of role or placement—in particular, if you see a "tool-input-start" chunk at top-level.

        let shouldCache = true;

        // If any top-level chunk is of type "tool-input-start", "tool-searchTool", or "step-start", do not cache
        for (const chunk of fullResponse) {
          if (chunk.type === "tool-input-start") {
            shouldCache = false;
            break;
          }
        }

        if (shouldCache) {
          redis.set(
            `${userPrompt}-${isSearchStream ? "search" : "final"}`,
            fullResponse,
            { ex: 60 * 60 * 24 * 7 }
          ); // 1 week
        } else {
        }
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};
