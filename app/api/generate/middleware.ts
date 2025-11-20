import { processMarkdown } from "@/lib/markdown";
import {
  type LanguageModelV2Middleware,
  type LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import { Redis } from "@upstash/redis";
import { simulateReadableStream } from "ai";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const cache = new Map<string, any>();

// Temporary cache for tool-call-only responses (before final response)
// Key: prompt-based cache key, Value: array of stream parts from tool calls
const tempToolCallCache = new Map<string, LanguageModelV2StreamPart[]>();

/**
 * Generate cache key from a prompt string
 */
export function getCacheKey(prompt: string): string {
  return JSON.stringify({ prompt: prompt.trim() });
}

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

export const cacheMiddleware: LanguageModelV2Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const cacheKey = JSON.stringify(params);

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const result = await doGenerate();

    cache.set(cacheKey, result);

    return result;
  },

  wrapStream: async ({ doStream, params }) => {
    // Extract just the user prompt text for caching to ensure identical prompts are cached together,
    // regardless of tool call details.
    const userPrompt = extractUserPrompt(params);
    const cacheKey = getCacheKey(userPrompt);
    // Check if the result is in the cache
    const cached = await redis.get(cacheKey);
  
    // If cached, return a simulated ReadableStream that yields the cached result
    if (cached !== null) {
      console.log("Found cached result");
      // Format the timestamps in the cached response
      const formattedChunks = (cached as LanguageModelV2StreamPart[]).map(
        (p) => {
          if (p.type === "response-metadata" && p.timestamp) {
            return { ...p, timestamp: new Date(p.timestamp) };
          } else return p;
        }
      );
      return {
        stream: simulateReadableStream({
          initialDelayInMs: 0,
          chunkDelayInMs: 10,
          chunks: formattedChunks,
        }),
      };
    }
  
    console.log("Not cached, proceeding...");
    // If not cached, proceed with streaming
    const { stream, ...rest } = await doStream();
  
    const fullResponse: LanguageModelV2StreamPart[] = [];
    let isCompleteResponse = false;
  
    const transformStream = new TransformStream<
      LanguageModelV2StreamPart,
      LanguageModelV2StreamPart
    >({
      transform(chunk, controller) {
        fullResponse.push(chunk);
        
        // Check if this is a finish event with a complete response
        if (chunk.type === 'finish') {
          // Only mark as complete if it's a full response, not just tool calls
          if (chunk.finishReason === 'stop' || chunk.finishReason === 'length') {
            isCompleteResponse = true;
          }
        }
        
        controller.enqueue(chunk);
      },
      flush() {
        if (isCompleteResponse) {
          console.log('Caching complete response');
          // Check if we have tool call chunks from a previous middleware call
          const toolCallChunks = tempToolCallCache.get(cacheKey);
          
          if (toolCallChunks && toolCallChunks.length > 0) {
            // Merge tool call chunks with final response
            const mergedResponse = [...toolCallChunks, ...fullResponse];
            console.log('Caching merged response (tool calls + final response)');
            redis.set(cacheKey, mergedResponse, { ex: 60 * 60 * 24 * 7 }); // 1 week
            // Clear the temp cache entry
            console.log('Clearing temp cache entry');
            tempToolCallCache.delete(cacheKey);
          } else {
            console.log('Caching complete response without tool calls because it is incomplete');
            redis.set(cacheKey, fullResponse, { ex: 60 * 60 * 24 * 7 }); // 1 week
          }
        } else {
          // Store tool call chunks in temp cache for later merging
          console.log('Storing tool call chunks in temp cache');
          tempToolCallCache.set(cacheKey, [...fullResponse]);
        }
      },
    });
  
    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};
